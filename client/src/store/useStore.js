import { create } from 'zustand';
import { nanoid } from 'nanoid';
import localforage from 'localforage';

import { CATEGORIES } from '../constants/categories';
import * as api from '../api/client';
import { isCloudUrl } from '../utils/helpers';

const imageStore = localforage.createInstance({ name: 'vaulted-images' });
const dataStore = localforage.createInstance({ name: 'vaulted-data' });


const useStore = create((set, get) => ({
  collections: [],
  publicCollections: [],
  loaded: false,
  username: 'Collector',

  // ── Auth State ──
  user: null,
  token: api.getToken(),
  isAuthenticated: !!api.getToken(),

  // ── Sync State ──
  syncing: false,
  syncingVisible: false,
  lastSynced: null,
  syncInterval: null,
  syncError: null,
  authExpiredMessage: null,

  // ── Initialize from storage ─
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

      // If we have a token, try to refresh it and sync
      if (api.getToken()) {
        try {
          const data = await api.refreshToken();
          set({ isAuthenticated: true, user: data.user || get().user });
          // Start sync polling for authenticated users
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
    set({ username: name });
    await dataStore.setItem('username', name);
  },

  // ── Persist helper ──
  _persist: async () => {
    const { collections } = get();
    await dataStore.setItem('collections', collections);
  },

  // ── Auth Actions ──
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

    // Sync from cloud after login with small delay to ensure token is ready
    setTimeout(async () => {
      await get().syncFromCloud();
      // After sync, migrate any local images to Cloudinary
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
  },

  logout: () => {
    api.logout();
    get().stopSyncPolling();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      collections: [],
      loaded: false,
      authExpiredMessage: null,
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
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      collections: [],
      loaded: false,
      authExpiredMessage: message,
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

  // ── Public Collections ──
  fetchPublicCollections: async () => {
    try {
      const publicCollections = await api.fetchPublicCollections();
      set({ publicCollections: publicCollections || [] });
    } catch {
      // Fail silently if public collections can't be fetched
    }
  },

  // ── Sync Polling ──
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

  // ── Sync Actions ──
  syncToCloud: async () => {
    if (!get().isAuthenticated || get().syncing) return;
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
    if (!get().isAuthenticated || get().syncing) return;
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
        isPublic: c.isPublic || false,
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

  // ── Migrate local images to Cloudinary ──
  migrateLocalImagesToCloud: async () => {
    if (!get().isAuthenticated) return;

    try {
      const { collections } = get();
      let migratedCount = 0;

      // Process all collections and items
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

      // Update store with migrated collections
      if (migratedCount > 0) {
        set({ collections: updatedCollections });
        await get()._persist();

        await get().syncToCloud();
      }
    } catch {
      // Migration failed - continue running with unsynced local images
    }
  },

  // ── Collection CRUD ──
  createCollection: async ({ name, category, description, coverColor, coverImage }, onProgress) => {
    let coverImageUrl = null;
    if (coverImage) {
      const imageId = `cover-${nanoid()}`;
      await imageStore.setItem(imageId, coverImage);
      coverImageUrl = imageId;

      // Upload cover image to server if authenticated
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
      isPublic: false,
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

      // Upload cover image to server if authenticated
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
        c.id === id ? { ...c, ...updates } : c
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
      for (const item of col.items) {
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
    set((state) => ({
      collections: state.collections.map((c) =>
        c.id === id ? { ...c, isPublic: !c.isPublic } : c
      ),
    }));
    await get()._persist();

    if (get().isAuthenticated) {
      try {
        await api.togglePublicAPI(id);
        // Immediately sync to ensure public/private state is synced
      } catch {
        // Revert on error
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, isPublic: !c.isPublic } : c
          ),
        }));
        await get()._persist();
      }
    }
  },

  // ── Item CRUD ──
  addItem: async (collectionId, { name, note, imageFile }, onProgress) => {
    let imageUrl = null;
    if (imageFile) {
      const imageId = `img-${nanoid()}`;
      await imageStore.setItem(imageId, imageFile);
      imageUrl = imageId;

      // Upload image to server if authenticated
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

      // Upload image to server if authenticated
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

  // ── Image loading ──
  getImageUrl: async (imageId) => {
    if (!imageId) return null;

    // If authenticated, try server first
    if (get().isAuthenticated) {
      return api.getImageUrl(imageId);
    }

    // Fall back to local storage
    const blob = await imageStore.getItem(imageId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },

  // ── Clean up local-only images not synced to cloud ──
  removeItemsWithBrokenImages: async (collectionId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;

    // Filter out items with local-only image IDs
    const validItems = col.items.filter((item) => !item.imageUrl || isCloudUrl(item.imageUrl));
    const brokenItems = col.items.filter((item) => item.imageUrl && !isCloudUrl(item.imageUrl));

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
          // Silent fail - items are already removed locally
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
}

export { CATEGORIES, useStore };
export default useStore;
