import { create } from 'zustand';
import { nanoid } from 'nanoid';
import localforage from 'localforage';

import { CATEGORIES } from '../constants/categories';
import * as api from '../api/client';
import { isCloudUrl } from '../utils/helpers';

const imageStore = localforage.createInstance({ name: 'vaulted-images' });
const dataStore = localforage.createInstance({ name: 'vaulted-data' });
const imageUrlCache = new Map();
const imagePromiseCache = new Map();
const VISIBILITY_OPTIONS = ['private', 'public', 'friends_only'];

function normalizeVisibility(value, fallback = 'private') {
  if (typeof value === 'string' && VISIBILITY_OPTIONS.includes(value)) return value;
  if (typeof value === 'boolean') return value ? 'public' : 'private';
  return fallback;
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function isLocalImageId(imageId) {
  return typeof imageId === 'string' && /^(img|cover)-/.test(imageId);
}

function canPrefetchImages() {
  if (isOffline()) return false;
  if (typeof navigator === 'undefined') return true;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) return true;
  if (connection.saveData) return false;

  const slowTypes = new Set(['slow-2g', '2g']);
  return !slowTypes.has(connection.effectiveType);
}

function schedulePrefetch(task) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(task, { timeout: 1500 });
    return;
  }

  setTimeout(task, 120);
}

function revokeIfBlobUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

function invalidateImageCache(imageId) {
  if (!imageId) return;

  const cachedUrl = imageUrlCache.get(imageId);
  revokeIfBlobUrl(cachedUrl);
  imageUrlCache.delete(imageId);
  imagePromiseCache.delete(imageId);
}

function clearImageCaches() {
  for (const cachedUrl of imageUrlCache.values()) {
    revokeIfBlobUrl(cachedUrl);
  }

  imageUrlCache.clear();
  imagePromiseCache.clear();
}


const useStore = create((set, get) => ({
  collections: [],
  publicCollections: [],
  loaded: false,
  username: 'Collector',

  // auth state
  user: null,
  token: api.getToken(),
  isAuthenticated: !!api.getToken(),

  // sync state
  syncing: false,
  syncingVisible: false,
  lastSynced: null,
  syncInterval: null,
  syncError: null,
  authExpiredMessage: null,
  friends: [],
  incomingFriendRequests: [],
  outgoingFriendRequests: [],

  // initialize from storage
  init: async () => {
    try {
      const saved = await dataStore.getItem('collections');
      const username = await dataStore.getItem('username');
      const user = await dataStore.getItem('user');

      if (saved) {
        set({
          collections: saved,
          loaded: true,
          username: username || 'Collector',
          user: user || null,
        });
      } else {
        set({ collections: [], loaded: true, user: user || null });
        await dataStore.setItem('collections', []);
      }

      // Fetch public collections (works for everyone)
      get().fetchPublicCollections();

      if (api.getToken()) {
        get().fetchFriends();
      }

      // If we have a token, try to refresh it and sync
      if (api.getToken()) {
        try {
          const data = await api.refreshToken();
          set({ isAuthenticated: true, user: data.user || get().user });
          get().fetchFriends();
          get().startSyncPolling();
        } catch {
          // Token expired or invalid
          api.setToken(null);
          set({ isAuthenticated: false, user: null, token: null });
        }
      }
    } catch {
      set({ collections: [], loaded: true });
    }
  },

  setUsername: async (name) => {
    const trimmedName = name?.trim();
    if (!trimmedName) return;

    const previousUser = get().user;
    const previousName = get().username;

    set((state) => ({
      username: trimmedName,
      user: state.user ? { ...state.user, username: trimmedName } : state.user,
    }));
    await dataStore.setItem('username', trimmedName);

    if (get().isAuthenticated) {
      try {
        const updated = await api.updateMyProfileAPI({ username: trimmedName });
        set({ username: updated.username, user: updated });
        await dataStore.setItem('user', updated);
        await dataStore.setItem('username', updated.username);
      } catch {
        set({ username: previousName, user: previousUser });
        await dataStore.setItem('username', previousName);
      }
    }
  },

  updateUserProfile: async (updates) => {
    const previousUser = get().user;
    if (!previousUser) return null;

    const optimisticUser = { ...previousUser, ...updates };
    set({ user: optimisticUser, username: optimisticUser.username || get().username });
    await dataStore.setItem('user', optimisticUser);

    try {
      const updated = await api.updateMyProfileAPI(updates);
      set({ user: updated, username: updated.username || get().username });
      await dataStore.setItem('user', updated);
      await dataStore.setItem('username', updated.username || get().username);
      return updated;
    } catch (error) {
      set({ user: previousUser, username: previousUser.username || get().username });
      await dataStore.setItem('user', previousUser);
      await dataStore.setItem('username', previousUser.username || get().username);
      throw error;
    }
  },

  // persist helper
  _persist: async () => {
    const { collections } = get();
    await dataStore.setItem('collections', collections);
  },

  // auth actions
  login: async (email, password) => {
    const data = await api.login(email, password);
    const user = data.user;
    set({
      user,
      token: data.token,
      isAuthenticated: true,
      username: user.username || user.email.split('@')[0],
      collections: [],
    });
    await dataStore.setItem('user', user);
    await dataStore.setItem('username', user.username || user.email.split('@')[0]);
    await dataStore.setItem('collections', []);
    get().fetchFriends();

    // short delay so the token cookie is set before the first sync fires
    setTimeout(async () => {
      await get().syncFromCloud();
      await get().migrateLocalImagesToCloud();
    }, 150);
  },

  register: async (email, password, username) => {
    const data = await api.register(email, password, username);
    const user = data.user;
    set({
      user,
      token: data.token,
      isAuthenticated: true,
      username: username || user.email.split('@')[0],
      collections: [],
    });
    await dataStore.setItem('user', user);
    await dataStore.setItem('username', username || user.email.split('@')[0]);
    await dataStore.setItem('collections', []);
    get().fetchFriends();
  },

  logout: () => {
    api.logout();
    get().stopSyncPolling();
    clearImageCaches();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      collections: [],
      loaded: false,
      authExpiredMessage: null,
      friends: [],
      incomingFriendRequests: [],
      outgoingFriendRequests: [],
    });
    dataStore.removeItem('user');
    dataStore.removeItem('username');
    dataStore.removeItem('collections');
    imageStore.clear();
    get().init();
  },

  logoutWithMessage: (message) => {
    api.logout();
    get().stopSyncPolling();
    clearImageCaches();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      collections: [],
      loaded: false,
      authExpiredMessage: message,
      friends: [],
      incomingFriendRequests: [],
      outgoingFriendRequests: [],
    });
    dataStore.removeItem('user');
    dataStore.removeItem('username');
    dataStore.removeItem('collections');
    imageStore.clear();
    get().init();
  },

  clearAuthExpiredMessage: () => {
    set({ authExpiredMessage: null });
  },

  // public collections
  fetchPublicCollections: async () => {
    if (isOffline()) return;

    try {
      const publicCollections = await api.fetchPublicCollections();
      set({
        publicCollections: (publicCollections || []).map((c) => ({
          ...c,
          visibility: normalizeVisibility(c.visibility, c.isPublic ? 'public' : 'private'),
          isPublic: normalizeVisibility(c.visibility, c.isPublic ? 'public' : 'private') === 'public',
        })),
      });
    } catch {
      // not critical, skip
    }
  },

  fetchFriends: async () => {
    if (!get().isAuthenticated || isOffline()) return;
    try {
      const data = await api.fetchFriendsAPI();
      set({
        friends: data.friends || [],
        incomingFriendRequests: data.incomingRequests || [],
        outgoingFriendRequests: data.outgoingRequests || [],
      });
    } catch {
      // not critical
    }
  },

  searchUsers: async (query) => {
    if (!get().isAuthenticated || !query?.trim()) return [];
    try {
      return await api.searchUsersAPI(query.trim());
    } catch {
      return [];
    }
  },

  sendFriendRequest: async (userId) => {
    await api.sendFriendRequestAPI(userId);
    await get().fetchFriends();
  },

  acceptFriendRequest: async (id) => {
    await api.acceptFriendRequestAPI(id);
    await get().fetchFriends();
  },

  rejectFriendRequest: async (id) => {
    await api.rejectFriendRequestAPI(id);
    await get().fetchFriends();
  },

  removeFriend: async (userId) => {
    await api.removeFriendAPI(userId);
    await get().fetchFriends();
  },

  // sync polling
  startSyncPolling: () => {
    get().stopSyncPolling();

    get().syncFromCloud();

    const interval = setInterval(() => {
      if (document.hidden) return;
      if (get().isAuthenticated && !get().syncing) {
        get().syncFromCloud();
        get().fetchPublicCollections();
      }
    }, 30000);

    set({ syncInterval: interval });
  },

  stopSyncPolling: () => {
    const { syncInterval } = get();
    if (syncInterval) {
      clearInterval(syncInterval);
      set({ syncInterval: null });
    }
  },

  clearSyncError: () => {
    set({ syncError: null });
  },

  // sync actions
  syncToCloud: async () => {
    if (!get().isAuthenticated || get().syncing || isOffline()) return;
    set({ syncing: true, syncingVisible: true, syncError: null });

    try {
      const { collections } = get();

      const syncCollections = collections.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        description: c.description,
        coverColor: c.coverColor,
        // Only sync cover image if it's a cloud URL, not a local-only ID
        coverImageUrl: isCloudUrl(c.coverImageUrl) ? c.coverImageUrl : null,
        isPublic: c.isPublic,
        visibility: normalizeVisibility(c.visibility, c.isPublic ? 'public' : 'private'),
        createdAt: c.createdAt,
        updatedAt: Date.now(),
      }));

      const syncItems = collections.flatMap((c) =>
        (c.items || []).map((item) => ({
          id: item.id,
          collectionId: c.id,
          name: item.name,
          note: item.note,
          // Only sync image if it's a cloud URL, not a local-only ID
          imageUrl: isCloudUrl(item.imageUrl) ? item.imageUrl : null,
          createdAt: item.createdAt,
          updatedAt: Date.now(),
        }))
      );

      await api.syncData({
        collections: syncCollections,
        items: syncItems,
        deletedCollectionIds: [],
        deletedItemIds: [],
      });

      set({ lastSynced: Date.now() });
    } catch {
      set({ syncError: 'Sync failed. Check your connection and try again.' });
    } finally {
      set({ syncing: false, syncingVisible: false });
    }
  },

  syncFromCloud: async () => {
    if (!get().isAuthenticated || get().syncing || isOffline()) return;
    set({ syncing: true, syncError: null });

    try {
      const cloudCollections = await api.fetchCollectionsWithItems();

      const localCollections = (cloudCollections || []).map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        description: c.description || '',
        coverColor: c.coverColor || '#7c3aed',
        coverImageUrl: isCloudUrl(c.coverImageUrl) ? c.coverImageUrl : null,
        items: (c.items || []).map((item) => ({
          id: item.id,
          name: item.name,
          note: item.note || '',
          imageUrl: isCloudUrl(item.imageUrl) ? item.imageUrl : null,
          createdAt: Number(item.createdAt) || Date.now(),
        })),
        visibility: normalizeVisibility(c.visibility, c.isPublic ? 'public' : 'private'),
        isPublic: normalizeVisibility(c.visibility, c.isPublic ? 'public' : 'private') === 'public',
        createdAt: Number(c.createdAt) || Date.now(),
        itemCount: c.items?.length || 0,
      }));

      set({ collections: localCollections });
      await get()._persist();
      set({ lastSynced: Date.now() });
    } catch {
      set({ syncError: 'Failed to sync collections. Check your connection and try again.' });
    } finally {
      set({ syncing: false });
    }
  },

  // migrate local images to Cloudinary
  migrateLocalImagesToCloud: async () => {
    if (!get().isAuthenticated) return;

    try {
      const { collections } = get();
      let migratedCount = 0;

      const updatedCollections = await Promise.all(
        collections.map(async (collection) => {
          let updatedCollection = { ...collection };

          // Migrate collection cover image
          if (updatedCollection.coverImageUrl && !isCloudUrl(updatedCollection.coverImageUrl)) {
            try {
              const blob = await imageStore.getItem(updatedCollection.coverImageUrl);
              if (blob) {
                const file = new File([blob], `cover-${collection.id}`, { type: blob.type });
                const uploadResult = await api.uploadImageAPI(file);
                updatedCollection.coverImageUrl = uploadResult.url;
                migratedCount++;
              }
            } catch {
              // Image migration failed - continue with other items
            }
          }

          // Migrate item images
          if (updatedCollection.items && updatedCollection.items.length > 0) {
            updatedCollection.items = await Promise.all(
              updatedCollection.items.map(async (item) => {
                let updatedItem = { ...item };

                if (updatedItem.imageUrl && !isCloudUrl(updatedItem.imageUrl)) {
                  try {
                    const blob = await imageStore.getItem(updatedItem.imageUrl);
                    if (blob) {
                      const file = new File([blob], `item-${item.id}`, { type: blob.type });
                      const uploadResult = await api.uploadImageAPI(file);
                      updatedItem.imageUrl = uploadResult.url;
                      migratedCount++;
                    }
                  } catch {
                    // Item image migration failed - continue with other items
                  }
                }

                return updatedItem;
              })
            );
          }

          return updatedCollection;
        })
      );

      if (migratedCount > 0) {
        set({ collections: updatedCollections });
        await get()._persist();

        await get().syncToCloud();
      }
    } catch {
      // Migration failed - continue running with unsynced local images
    }
  },

  // collection CRUD
  createCollection: async ({ name, category, description, coverColor, coverImage, visibility = 'private' }, onProgress) => {
    let coverImageUrl = null;
    if (coverImage) {
      const imageId = `cover-${nanoid()}`;
      await imageStore.setItem(imageId, coverImage);
      coverImageUrl = imageId;

      if (get().isAuthenticated) {
        try {
          const uploadResult = await api.uploadImageAPI(coverImage, onProgress);
          coverImageUrl = uploadResult.url;
        } catch {
          // Cover image upload failed - continue with local fallback
        }
      }
    }

    const newCollection = {
      id: nanoid(),
      name,
      category,
      description: description || '',
      coverColor: coverColor || '#7c3aed',
      coverImageUrl,
      items: [],
      visibility: normalizeVisibility(visibility, 'private'),
      isPublic: normalizeVisibility(visibility, 'private') === 'public',
      createdAt: Date.now(),
      itemCount: 0,
    };
    set((state) => ({ collections: [newCollection, ...state.collections] }));
    await get()._persist();

    if (get().isAuthenticated) {
      try {
        await api.createCollectionAPI({
          id: newCollection.id,
          name,
          category,
          description: description || '',
          coverColor: coverColor || '#7c3aed',
          coverImageUrl,
          visibility: newCollection.visibility,
          isPublic: newCollection.visibility === 'public',
          createdAt: newCollection.createdAt,
        });
      } catch {
        // Revert on error
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== newCollection.id),
        }));
        await get()._persist();
      }
    }

    return newCollection.id;
  },

  updateCollection: async (id, updates, onProgress) => {
    // Save old state for rollback
    const oldCollection = get().collections.find((c) => c.id === id);
    if (!oldCollection) return;

    if (updates.coverImage) {
      const imageId = `cover-${nanoid()}`;
      await imageStore.setItem(imageId, updates.coverImage);
      updates.coverImageUrl = imageId;

      if (get().isAuthenticated) {
        try {
          const uploadResult = await api.uploadImageAPI(updates.coverImage, onProgress);
          updates.coverImageUrl = uploadResult.url;
        } catch {
          // Cover image upload failed - continue with previous image
        }
      }
      delete updates.coverImage;
    }

    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id
          ? {
              ...c,
              ...updates,
              visibility: normalizeVisibility(
                updates.visibility,
                updates.isPublic !== undefined ? (updates.isPublic ? 'public' : 'private') : c.visibility
              ),
              isPublic: normalizeVisibility(
                updates.visibility,
                updates.isPublic !== undefined ? (updates.isPublic ? 'public' : 'private') : c.visibility
              ) === 'public',
            }
          : c
      ),
    }));
    await get()._persist();

    if (get().isAuthenticated) {
      try {
        const updatePayload = {
          name: updates.name,
          category: updates.category,
          description: updates.description,
          coverColor: updates.coverColor,
          visibility: updates.visibility,
        };
        // Only include coverImageUrl if it was updated
        if (updates.coverImageUrl) {
          updatePayload.coverImageUrl = updates.coverImageUrl;
        }
        await api.updateCollectionAPI(id, updatePayload);
      } catch {
        // Revert on error
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? oldCollection : c
          ),
        }));
        await get()._persist();
      }
    }
  },

  deleteCollection: async (id) => {
    const col = get().collections.find((c) => c.id === id);
    if (col) {
      invalidateImageCache(col.coverImageUrl);
      for (const item of col.items) {
        invalidateImageCache(item.imageUrl);
        if (item.imageUrl) await imageStore.removeItem(item.imageUrl);
      }
    }
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
    }));
    await get()._persist();

    if (get().isAuthenticated) {
      try {
        await api.deleteCollectionAPI(id);
      } catch {
        // Revert on error
        if (col) {
          set((state) => ({
            collections: [col, ...state.collections],
          }));
          await get()._persist();
        }
      }
    }
  },

  togglePublic: async (id) => {
    const target = get().collections.find((c) => c.id === id);
    if (!target) return;
    const nextVisibility = normalizeVisibility(target.visibility, target.isPublic ? 'public' : 'private') === 'public'
      ? 'private'
      : 'public';
    await get().setCollectionVisibility(id, nextVisibility);
  },

  setCollectionVisibility: async (id, visibility) => {
    const normalized = normalizeVisibility(visibility, null);
    if (!normalized) return;

    const previous = get().collections;
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, visibility: normalized, isPublic: normalized === 'public' } : c
      ),
    }));
    await get()._persist();

    if (get().isAuthenticated) {
      try {
        await api.setCollectionVisibilityAPI(id, normalized);
      } catch (err) {
        set({ collections: previous });
        await get()._persist();
        throw err;
      }
    }
  },

  // item CRUD
  addItem: async (collectionId, { name, note, imageFile }, onProgress) => {
    let imageUrl = null;
    if (imageFile) {
      const imageId = `img-${nanoid()}`;
      await imageStore.setItem(imageId, imageFile);
      imageUrl = imageId;

      if (get().isAuthenticated) {
        try {
          const uploadResult = await api.uploadImageAPI(imageFile, onProgress);
          imageUrl = uploadResult.url;
        } catch {
          // Image upload failed - continue with local fallback
        }
      }
    }

    const newItem = {
      id: nanoid(),
      name,
      note: note || '',
      imageUrl,
      createdAt: Date.now(),
    };

    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === collectionId
          ? { ...c, items: [newItem, ...c.items], itemCount: c.items.length + 1 }
          : c
      ),
    }));
    await get()._persist();

    if (get().isAuthenticated) {
      try {
        await api.addItemAPI(collectionId, {
          id: newItem.id,
          name,
          note: note || '',
          imageUrl,
          createdAt: newItem.createdAt,
        });
      } catch {
        // Revert on error
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? { ...c, items: c.items.filter((i) => i.id !== newItem.id), itemCount: c.items.length - 1 }
              : c
          ),
        }));
        await get()._persist();
      }
    }
  },

  updateItem: async (collectionId, itemId, updates, onProgress) => {
    // Save old item for rollback
    const col = get().collections.find((c) => c.id === collectionId);
    const oldItem = col?.items.find((i) => i.id === itemId);
    if (!oldItem) return;

    if (updates.imageFile) {
      const imageId = `img-${nanoid()}`;
      await imageStore.setItem(imageId, updates.imageFile);
      updates.imageUrl = imageId;

      if (get().isAuthenticated) {
        try {
          const uploadResult = await api.uploadImageAPI(updates.imageFile, onProgress);
          updates.imageUrl = uploadResult.url;
        } catch {
          // Image upload failed - continue with local fallback
        }
      }
      delete updates.imageFile;
    }

    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              items: c.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }
          : c
      ),
    }));
    await get()._persist();

    if (get().isAuthenticated) {
      try {
        await api.updateItemAPI(itemId, {
          name: updates.name,
          note: updates.note,
          imageUrl: updates.imageUrl,
        });
      } catch {
        // Revert on error
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === collectionId
              ? {
                  ...c,
                  items: c.items.map((item) =>
                    item.id === itemId ? oldItem : item
                  ),
                }
              : c
          ),
        }));
        await get()._persist();
      }
    }
  },

  deleteItem: async (collectionId, itemId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    const item = col?.items.find((i) => i.id === itemId);
    invalidateImageCache(item?.imageUrl);
    if (item?.imageUrl) await imageStore.removeItem(item.imageUrl);

    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === collectionId
          ? { ...c, items: c.items.filter((i) => i.id !== itemId), itemCount: c.items.length - 1 }
          : c
      ),
    }));
    await get()._persist();

    if (get().isAuthenticated) {
      try {
        await api.deleteItemAPI(itemId);
      } catch {
        // Revert on error
        if (item && col) {
          set((state) => ({
            collections: state.collections.map((c) =>
              c.id === collectionId
                ? { ...c, items: [...c.items, item], itemCount: c.items.length + 1 }
                : c
            ),
          }));
          await get()._persist();
        }
      }
    }
  },

  // image loading
  getImageUrl: async (imageId) => {
    if (!imageId) return null;

    if (imageUrlCache.has(imageId)) {
      return imageUrlCache.get(imageId);
    }

    if (imagePromiseCache.has(imageId)) {
      return imagePromiseCache.get(imageId);
    }

    const resolveImageUrl = async () => {
      if (isCloudUrl(imageId)) {
        return imageId;
      }

      // Local image IDs should resolve from IndexedDB first to avoid broken network fetches.
      if (isLocalImageId(imageId)) {
        const localBlob = await imageStore.getItem(imageId);
        return localBlob ? URL.createObjectURL(localBlob) : null;
      }

      // If authenticated, try server first
      if (get().isAuthenticated) {
        return api.getImageUrl(imageId);
      }

      // Fall back to local storage
      const blob = await imageStore.getItem(imageId);
      if (!blob) return null;
      return URL.createObjectURL(blob);
    };

    const pending = resolveImageUrl()
      .then((resolvedUrl) => {
        if (resolvedUrl) {
          imageUrlCache.set(imageId, resolvedUrl);
        }
        return resolvedUrl;
      })
      .finally(() => {
        imagePromiseCache.delete(imageId);
      });

    imagePromiseCache.set(imageId, pending);
    return pending;
  },

  prefetchImages: (imageIds = [], options = {}) => {
    if (!Array.isArray(imageIds) || imageIds.length === 0) return;
    if (!canPrefetchImages()) return;

    const { limit = 12 } = options;
    const seen = new Set();
    const targets = [];

    for (const imageId of imageIds) {
      if (!imageId || seen.has(imageId)) continue;
      seen.add(imageId);

      if (imageUrlCache.has(imageId) || imagePromiseCache.has(imageId)) continue;

      targets.push(imageId);
      if (targets.length >= limit) break;
    }

    if (targets.length === 0) return;

    schedulePrefetch(() => {
      for (const imageId of targets) {
        get().getImageUrl(imageId).catch(() => {
          // prefetch errors should never reach the UI
        });
      }
    });
  },

  // clean up local-only images not synced to cloud
  removeItemsWithBrokenImages: async (collectionId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;

    const validItems = col.items.filter((item) => !item.imageUrl || isCloudUrl(item.imageUrl));
    const brokenItems = col.items.filter((item) => item.imageUrl && !isCloudUrl(item.imageUrl));

    for (const item of brokenItems) {
      invalidateImageCache(item.imageUrl);
    }

    if (brokenItems.length > 0) {
      set((state) => ({
        collections: state.collections.map((c) =>
          c.id === collectionId
            ? { ...c, items: validItems, itemCount: validItems.length }
            : c
        ),
      }));
      await get()._persist();

      // If authenticated, sync the removal
      if (get().isAuthenticated) {
        try {
          for (const item of brokenItems) {
            await api.deleteItemAPI(item.id);
          }
        } catch {
          // already gone locally, doesn't matter
        }
      }
    }
  },
}));

// Listen for auth expiration events
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    useStore.getState().logoutWithMessage(
      'Your session has expired. Please sign in again to continue.'
    );
  });

  window.addEventListener('online', () => {
    const state = useStore.getState();
    state.fetchPublicCollections();
    if (state.isAuthenticated) {
      state.syncFromCloud();
    }
  });
}

export { CATEGORIES, useStore };
export default useStore;
