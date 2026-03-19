/* eslint-disable no-unused-vars */
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import localforage from 'localforage';

import { StackIcon as Stack } from '@phosphor-icons/react/Stack';
import { MusicNotesIcon as MusicNotes } from '@phosphor-icons/react/MusicNotes';
import { PersonArmsSpreadIcon as PersonArmsSpread } from '@phosphor-icons/react/PersonArmsSpread';
import { TShirtIcon as TShirt } from '@phosphor-icons/react/TShirt';
import { PushPinIcon as PushPin } from '@phosphor-icons/react/PushPin';
import { SneakerIcon as Sneaker } from '@phosphor-icons/react/Sneaker';
import { BookOpenIcon as BookOpen } from '@phosphor-icons/react/BookOpen';
import { GameControllerIcon as GameController } from '@phosphor-icons/react/GameController';
import { CurrencyCircleDollarIcon as CurrencyCircleDollar } from '@phosphor-icons/react/CurrencyCircleDollar';
import { ScrollIcon as Scroll } from '@phosphor-icons/react/Scroll';
import { PaintBrushIcon as PaintBrush } from '@phosphor-icons/react/PaintBrush';
import { SparkleIcon as Sparkle } from '@phosphor-icons/react/Sparkle';

import * as api from '../api/client';

const imageStore = localforage.createInstance({ name: 'vaulted-images' });
const dataStore = localforage.createInstance({ name: 'vaulted-data' });

const CATEGORIES = [
  { id: 'trading-cards', label: 'Trading Cards', Icon: Stack },
  { id: 'music', label: 'Music', Icon: MusicNotes },
  { id: 'figures', label: 'Figures', Icon: PersonArmsSpread },
  { id: 'clothes', label: 'Clothes', Icon: TShirt },
  { id: 'pins', label: 'Pins', Icon: PushPin },
  { id: 'sneakers', label: 'Sneakers', Icon: Sneaker },
  { id: 'manga', label: 'Manga', Icon: BookOpen },
  { id: 'video-games', label: 'Video Games', Icon: GameController },
  { id: 'coins', label: 'Coins', Icon: CurrencyCircleDollar },
  { id: 'art', label: 'Art', Icon: PaintBrush },
  { id: 'anime', label: 'Anime', Icon: Scroll },
  { id: 'custom', label: 'Custom', Icon: Sparkle },
];


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

    // Sync from cloud after login
    get().syncFromCloud();
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
    } catch (err) {
      // Fail silently if public collections can't be fetched
    }
  },

  // ── Sync Polling ──
  startSyncPolling: () => {
    // Stop any existing interval
    get().stopSyncPolling();

    // Sync immediately
    get().syncFromCloud();

    // Then poll every 5 seconds when authenticated
    const interval = setInterval(() => {
      if (get().isAuthenticated && !get().syncing) {
        get().syncFromCloud();
        get().fetchPublicCollections();
      }
    }, 5000);

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

      // Helper to check if URL is a cloud URL (not a local-only ID)
      const isCloudUrl = (url) => {
        if (!url) return true; // null/undefined is ok
        // Check if it's a full HTTP(S) URL or Cloudinary CDN
        return url.startsWith('http://') || url.startsWith('https://');
      };

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
    } catch (err) {
      set({ syncError: 'Sync failed. Check your connection and try again.' });
    } finally {
      set({ syncing: false, syncingVisible: false });
    }
  },

  syncFromCloud: async () => {
    if (!get().isAuthenticated || get().syncing) return;
    set({ syncing: true, syncError: null });

    try {
      const cloudCollections = await api.fetchCollections();

      // Helper to check if URL is a cloud URL (not a local-only ID)
      const isCloudUrl = (url) => {
        if (!url) return true; // null/undefined is ok
        return url.startsWith('http://') || url.startsWith('https://');
      };

      if (cloudCollections && cloudCollections.length > 0) {
        const localCollections = await Promise.all(
          cloudCollections.map(async (c) => {
            const cloudItems = await api.fetchItems(c.id);
            return {
              id: c.id,
              name: c.name,
              category: c.category,
              description: c.description || '',
              coverColor: c.coverColor || c.cover_color || '#7c3aed',
              // Filter out local-only cover images
              coverImageUrl: isCloudUrl(c.coverImageUrl || c.cover_image_url) ? (c.coverImageUrl || c.cover_image_url) : null,
              items: (cloudItems || []).map((item) => ({
                id: item.id,
                name: item.name,
                note: item.note || '',
                // Filter out local-only item images
                imageUrl: isCloudUrl(item.imageUrl || item.image_url) ? (item.imageUrl || item.image_url) : null,
                createdAt: Number(item.createdAt || item.created_at) || Date.now(),
              })),
              isPublic: c.isPublic || c.is_public || false,
              createdAt: Number(c.createdAt || c.created_at) || Date.now(),
              itemCount: cloudItems?.length || 0,
            };
          })
        );

        set({ collections: localCollections });
        await get()._persist();
      } else {
        set({ collections: [] });
        await get()._persist();
      }

      set({ lastSynced: Date.now() });
    } catch (err) {
      set({ syncError: 'Failed to sync collections. Check your connection and try again.' });
    } finally {
      set({ syncing: false });
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
        } catch (err) { /* empty */ }
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
        // Sync to ensure all changes are reflected
        await get().syncToCloud();
      } catch (err) {
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
        } catch (err) { /* empty */ }
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
        // Sync to ensure all changes are reflected
        await get().syncToCloud();
      } catch (err) {
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
        // Sync to ensure deletion is reflected
        await get().syncToCloud();
      } catch (err) {
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
        await get().syncToCloud();
      } catch (err) {
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
        } catch (err) { /* empty */ }
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
        // Sync to ensure item is reflected
        await get().syncToCloud();
      } catch (err) {
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
        } catch (err) { /* empty */ }
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
        // Sync to ensure item update is reflected
        await get().syncToCloud();
      } catch (err) {
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
        // Sync to ensure deletion is reflected
        await get().syncToCloud();
      } catch (err) {
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

    const isCloudUrl = (url) => {
      if (!url) return true;
      return url.startsWith('http://') || url.startsWith('https://');
    };

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
          await get().syncToCloud();
        } catch (err) {
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
