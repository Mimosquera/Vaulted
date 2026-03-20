import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { ArrowLeftIcon as ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { ShareNetworkIcon as ShareNetwork } from '@phosphor-icons/react/ShareNetwork';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { EyeSlashIcon as EyeSlash } from '@phosphor-icons/react/EyeSlash';
import { MagnifyingGlassIcon as MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import useStore from '../store/useStore';
import ItemCard from '../components/Collection/ItemCard';
import ItemLightbox from '../components/Collection/ItemLightbox';
import AddItemModal from '../components/Modals/AddItemModal';
import EditItemModal from '../components/Modals/EditItemModal';
import EditCollectionModal from '../components/Modals/EditCollectionModal';
import ShareModal from '../components/Modals/ShareModal';
import BlobBackground from '../components/UI/BlobBackground';
import CategoryIcon from '../components/UI/CategoryIcon';
import { getCategoryLabel, isCloudUrl, optimizeImageUrl } from '../utils/helpers';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import './CollectionView.scss';

const MASONRY_COLS = { default: 4, 1100: 3, 700: 2 };

export default function CollectionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const collection = useStore((s) => s.collections.find((c) => c.id === id));
  const addItem = useStore((s) => s.addItem);
  const updateItem = useStore((s) => s.updateItem);
  const deleteCollection = useStore((s) => s.deleteCollection);
  const updateCollection = useStore((s) => s.updateCollection);
  const togglePublic = useStore((s) => s.togglePublic);
  const getImageUrl = useStore((s) => s.getImageUrl);
  const prefetchImages = useStore((s) => s.prefetchImages);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [editCollectionModalOpen, setEditCollectionModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);
  const [coverUrl, setCoverUrl] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let blobUrl = null;

    if (collection?.coverImageUrl) {
      if (isCloudUrl(collection.coverImageUrl)) {
        setCoverUrl(collection.coverImageUrl);
      } else {
        getImageUrl(collection.coverImageUrl).then((u) => {
          if (!mountedRef.current) {
            if (u && !isCloudUrl(u)) URL.revokeObjectURL(u);
            return;
          }
          if (u && !isCloudUrl(u)) blobUrl = u;
          setCoverUrl(u);
        });
      }
    } else {
      setCoverUrl(null);
    }

    return () => {
      mountedRef.current = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection?.coverImageUrl]);

  const filteredItems = useMemo(() => {
    if (!collection) return [];
    if (!debouncedSearch) return collection.items;
    const q = debouncedSearch.toLowerCase();
    return collection.items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.note?.toLowerCase().includes(q)
    );
  }, [collection, debouncedSearch]);

  useEffect(() => {
    if (!filteredItems.length) return;

    prefetchImages(
      filteredItems.map((item) => item.imageUrl).filter(Boolean),
      { limit: 12 }
    );
  }, [filteredItems, prefetchImages]);

  if (!collection) {
    return (
      <div className="collection-view page">
        <div className="container">
          <div className="collection-view__not-found">
            <h2>Collection not found</h2>
            <Link to="/dashboard" className="btn btn--secondary">
              <ArrowLeft weight="bold" />
              Back to Vault
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    deleteCollection(collection.id);
    navigate('/dashboard');
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setEditItemModalOpen(true);
  };

  const handleUpdateItem = (itemData, onProgress) => {
    updateItem(collection.id, editingItem.id, itemData, onProgress);
    setEditingItem(null);
    setEditItemModalOpen(false);
  };

  const handleUpdateCollection = (collectionData, onProgress) => {
    updateCollection(collection.id, collectionData, onProgress);
    setEditCollectionModalOpen(false);
  };

  const handleExpandItem = (item, imageUrl) => {
    setLightboxItem(item);
    setLightboxImageUrl(imageUrl);
  };

  const coverColor = collection.coverColor || '#7c3aed';
  const coverWidthHint = Math.min(2200, Math.max(900, Math.round(window.innerWidth * (window.devicePixelRatio || 1))));
  const optimizedCoverUrl = coverUrl ? optimizeImageUrl(coverUrl, { width: coverWidthHint, fit: 'cover' }) : null;

  return (
    <div className="collection-view page">
      <BlobBackground />

      {/* ── Cover Banner ── */}
      <motion.div
        className="collection-view__cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className="collection-view__cover-solid"
          style={{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor}88)` }}
        />
        {optimizedCoverUrl && (
          <img
            src={optimizedCoverUrl}
            alt=""
            className="collection-view__cover-img"
            onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
            onError={(e) => e.currentTarget.remove()}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        )}
        <div className="collection-view__cover-fade" />

        <div className="collection-view__cover-nav container">
          <Link to="/dashboard" className="collection-view__back">
            <ArrowLeft weight="bold" size={18} />
            Back
          </Link>
        </div>

        <div className="collection-view__cover-content container">
          <div className="collection-view__category">
            <CategoryIcon category={collection.category} size={16} />
            {getCategoryLabel(collection.category)}
            {collection.isPublic && (
              <span className="collection-view__public-badge">
                <Eye weight="bold" size={11} /> Public
              </span>
            )}
          </div>
          <h1 className="collection-view__title">{collection.name}</h1>
          {collection.description && (
            <p className="collection-view__desc">{collection.description}</p>
          )}
          <span className="collection-view__count">
            {collection.items.length} {collection.items.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </motion.div>

      {/* ── Content ── */}
      <div className="container">
        {/* ── Toolbar ── */}
        <motion.div
          className="collection-view__toolbar"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="collection-view__toolbar-left">
            <button className="btn btn--primary" onClick={() => setAddModalOpen(true)}>
              <Plus strokeWidth={2} size={16} />
              Add Item
            </button>
            <button className="btn btn--secondary" onClick={() => setEditCollectionModalOpen(true)}>
              <Edit2 strokeWidth={2} size={14} />
              Edit
            </button>
          </div>
          <div className="collection-view__toolbar-right">
            <button className="btn btn--secondary" onClick={() => setShareModalOpen(true)}>
              <ShareNetwork weight="bold" size={16} />
              Share
            </button>
            <button className="btn btn--ghost" onClick={() => togglePublic(collection.id)}>
              {collection.isPublic ? <EyeSlash weight="bold" size={16} /> : <Eye weight="bold" size={16} />}
              {collection.isPublic ? 'Private' : 'Public'}
            </button>
            <button className="btn btn--danger btn--sm" onClick={handleDelete}>
              <Trash2 strokeWidth={2} size={14} />
            </button>
          </div>
        </motion.div>

        {/* ── Search ── */}
        {collection.items.length > 3 && (
          <motion.div
            className="collection-view__search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <MagnifyingGlass weight="bold" size={18} />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </motion.div>
        )}

        {/* ── Items Grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {filteredItems.length > 0 ? (
            <AnimatePresence mode="popLayout">
              <Masonry
                breakpointCols={MASONRY_COLS}
                className="collection-view__grid"
                columnClassName="collection-view__grid-col"
              >
                {filteredItems.map((item, i) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    collectionId={collection.id}
                    index={i}
                    onEdit={handleEditItem}
                    onExpand={handleExpandItem}
                  />
                ))}
              </Masonry>
            </AnimatePresence>
          ) : (
            <div className="collection-view__empty">
              <motion.span
                className="collection-view__empty-icon"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <CategoryIcon category={collection.category} size={48} />
              </motion.span>
              <h3>{search ? 'No items match your search' : 'No items yet'}</h3>
              <p>{search ? 'Try a different search.' : 'Add your first item to this collection!'}</p>
              {!search && (
                <button className="btn btn--primary" onClick={() => setAddModalOpen(true)}>
                  <Plus strokeWidth={2} size={16} />
                  Add Your First Item
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>

      <AddItemModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={(data, onProgress) => addItem(collection.id, data, onProgress)}
      />

      <EditItemModal
        isOpen={editItemModalOpen}
        onClose={() => setEditItemModalOpen(false)}
        onUpdate={handleUpdateItem}
        item={editingItem}
      />

      <EditCollectionModal
        isOpen={editCollectionModalOpen}
        onClose={() => setEditCollectionModalOpen(false)}
        onUpdate={handleUpdateCollection}
        collection={collection}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        collection={collection}
      />

      <ItemLightbox
        item={lightboxItem}
        imageUrl={lightboxImageUrl}
        isOpen={!!lightboxItem}
        onClose={() => { setLightboxItem(null); setLightboxImageUrl(null); }}
      />
    </div>
  );
}
