import { useState, useMemo } from 'react';
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
import { getCategoryLabel } from '../utils/helpers';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import CategoryIcon from '../components/UI/CategoryIcon';
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

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItemModalOpen, setEditItemModalOpen] = useState(false);
  const [editCollectionModalOpen, setEditCollectionModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  const filteredItems = useMemo(() => {
    if (!collection) return [];
    if (!debouncedSearch) return collection.items;
    const q = debouncedSearch.toLowerCase();
    return collection.items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.note?.toLowerCase().includes(q)
    );
  }, [collection, debouncedSearch]);

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

  return (
    <div className="collection-view page">
      <BlobBackground color1={collection.coverColor} />
      <div className="container">

        {/* ── Hero Header ── */}
        <motion.div
          className="collection-view__hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to="/dashboard" className="collection-view__back">
            <ArrowLeft weight="bold" size={18} />
            Back to Vault
          </Link>

          <div className="collection-view__hero-info">
            <motion.div
              className="collection-view__icon"
              style={{ backgroundColor: `${collection.coverColor}20` }}
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CategoryIcon category={collection.category} size={40} />
            </motion.div>

            <div className="collection-view__hero-text">
              <div className="collection-view__category">
                {getCategoryLabel(collection.category)}
                {collection.isPublic && (
                  <span className="collection-view__public-badge">
                    <Eye weight="bold" size={12} /> Public
                  </span>
                )}
              </div>
              <h1>{collection.name}</h1>
              {collection.description && <p>{collection.description}</p>}
              <span className="collection-view__count">
                {collection.items.length} {collection.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          <div className="collection-view__actions">
            <button
              className="btn btn--secondary"
              onClick={() => setEditCollectionModalOpen(true)}
            >
              <Edit2 strokeWidth={2} />
              Edit
            </button>
            <button
              className="btn btn--primary"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus strokeWidth={2} size={16} />
              Add Item
            </button>
            <button
              className="btn btn--secondary"
              onClick={() => setShareModalOpen(true)}
            >
              <ShareNetwork weight="bold" />
              Share
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => togglePublic(collection.id)}
            >
              {collection.isPublic ? <EyeSlash weight="bold" /> : <Eye weight="bold" />}
              {collection.isPublic ? 'Private' : 'Public'}
            </button>
            <button className="btn btn--danger btn--sm" onClick={handleDelete}>
              <Trash2 strokeWidth={2} />
              Delete
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
