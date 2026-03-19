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
  loaded: false,
  username: 'Collector',

  // ── Auth State ──
  user: null,
  token: api.getToken(),
  isAuthenticated: !!api.getToken(),

  // ── Sync State ──
  syncing: false,
  lastSynced: null,

  // ── Initialize from storage ──
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

      // If we have a token, try to refresh it and sync
      if (api.getToken()) {
        try {
          const data = await api.refreshToken();
          set({ isAuthenticated: true, user: data.user || get().user });
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
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      collections: [],
      loaded: false,
    });
    dataStore.removeItem('user');
    dataStore.removeItem('username');
    dataStore.removeItem('collections');
    imageStore.clear();
    get().init();
  },

  // ── Sync Actions ──
  syncToCloud: async () => {
    if (!get().isAuthenticated || get().syncing) return;
    set({ syncing: true });

    try {
      const { collections } = get();

      const syncCollections = collections.map((c) => ({
        id: c.id,
        name: c.name,
        category: c.category,
        description: c.description,
        coverColor: c.coverColor,
        coverImageUrl: c.coverImageUrl,
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
          imageUrl: item.imageUrl,
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
      console.error('Sync to cloud failed:', err);
    } finally {
      set({ syncing: false });
    }
  },

  syncFromCloud: async () => {
    if (!get().isAuthenticated || get().syncing) return;
    set({ syncing: true });

    try {
      const cloudCollections = await api.fetchCollections();

      if (cloudCollections && cloudCollections.length > 0) {
        const localCollections = await Promise.all(
          cloudCollections.map(async (c) => {
            const cloudItems = await api.fetchItems(c.id);
            return {
              id: c.id,
              name: c.name,
              category: c.category,
              description: c.description || '',
              coverColor: c.cover_color || '#7c3aed',
              coverImageUrl: c.cover_image_url || null,
              items: (cloudItems || []).map((item) => ({
                id: item.id,
                name: item.name,
                note: item.note || '',
                imageUrl: item.image_url || null,
                createdAt: Number(item.created_at) || Date.now(),
              })),
              isPublic: c.is_public || false,
              createdAt: Number(c.created_at) || Date.now(),
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
      console.error('Sync from cloud failed:', err);
    } finally {
      set({ syncing: false });
    }
  },

  // ── Collection CRUD ──
  createCollection: async ({ name, category, description, coverColor, coverImage }) => {
    let coverImageUrl = null;
    if (coverImage) {
      const imageId = `cover-${nanoid()}`;
      await imageStore.setItem(imageId, coverImage);
      coverImageUrl = imageId;
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
      } catch (err) {
        console.error('Cloud sync failed for createCollection:', err);
      }
    }

    return newCollection.id;
  },

  updateCollection: async (id, updates) => {
    if (updates.coverImage) {
      const imageId = `cover-${nanoid()}`;
      await imageStore.setItem(imageId, updates.coverImage);
      updates.coverImageUrl = imageId;
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
        await api.updateCollectionAPI(id, {
          name: updates.name,
          category: updates.category,
          description: updates.description,
          coverColor: updates.coverColor,
        });
      } catch (err) {
        console.error('Cloud sync failed for updateCollection:', err);
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
      } catch (err) {
        console.error('Cloud sync failed for deleteCollection:', err);
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
      } catch (err) {
        console.error('Cloud sync failed for togglePublic:', err);
      }
    }
  },

  // ── Item CRUD ──
  addItem: async (collectionId, { name, note, imageFile }) => {
    let imageUrl = null;
    if (imageFile) {
      const imageId = `img-${nanoid()}`;
      await imageStore.setItem(imageId, imageFile);
      imageUrl = imageId;
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
      } catch (err) {
        console.error('Cloud sync failed for addItem:', err);
      }
    }
  },

  updateItem: async (collectionId, itemId, updates) => {
    if (updates.imageFile) {
      const imageId = `img-${nanoid()}`;
      await imageStore.setItem(imageId, updates.imageFile);
      updates.imageUrl = imageId;
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
      } catch (err) {
        console.error('Cloud sync failed for updateItem:', err);
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
      } catch (err) {
        console.error('Cloud sync failed for deleteItem:', err);
      }
    }
  },

  // ── Image loading ──
  getImageUrl: async (imageId) => {
    if (!imageId) return null;
    const blob = await imageStore.getItem(imageId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },
}));

// Listen for auth expiration events
if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    useStore.getState().logout();
  });
}

export { CATEGORIES, useStore };
export default useStore;
