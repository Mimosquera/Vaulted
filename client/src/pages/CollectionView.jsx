import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { ArrowLeftIcon as ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { PlusIcon as Plus } from '@phosphor-icons/react/Plus';
import { ShareNetworkIcon as ShareNetwork } from '@phosphor-icons/react/ShareNetwork';
import { TrashIcon as Trash } from '@phosphor-icons/react/Trash';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { EyeSlashIcon as EyeSlash } from '@phosphor-icons/react/EyeSlash';
import { MagnifyingGlassIcon as MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { PencilSimpleIcon as PencilSimple } from '@phosphor-icons/react/PencilSimple';
import useStore from '../store/useStore';
import ItemCard from '../components/Collection/ItemCard';
import AddItemModal from '../components/Modals/AddItemModal';
import EditItemModal from '../components/Modals/EditItemModal';
import EditCollectionModal from '../components/Modals/EditCollectionModal';
import ShareModal from '../components/Modals/ShareModal';
import BlobBackground from '../components/UI/BlobBackground';
import { getCategoryLabel } from '../utils/helpers';
import CategoryIcon from '../components/UI/CategoryIcon';
import './CollectionView.scss';

const MASONRY_COLS = { default: 4, 1100: 3, 700: 2, 500: 1 };

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredItems = useMemo(() => {
    if (!collection) return [];
    if (!search) return collection.items;
    const q = search.toLowerCase();
    return collection.items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.note?.toLowerCase().includes(q)
    );
  }, [collection, search]);

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

  const handleUpdateItem = (itemData) => {
    updateItem(collection.id, editingItem.id, itemData);
    setEditingItem(null);
    setEditItemModalOpen(false);
  };

  const handleUpdateCollection = (collectionData) => {
    updateCollection(collection.id, collectionData);
    setEditCollectionModalOpen(false);
  };

  return (
    <div className="collection-view page">
      <BlobBackground color1={collection.coverColor} />
      <div className="container">

        {/* ── Hero Header ── */}
        <motion.div
          className="collection-view__hero"
          initial={isMobile ? {} : { opacity: 0, y: 20 }}
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
              <PencilSimple weight="bold" />
              Edit
            </button>
            <button
              className="btn btn--primary"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus weight="bold" />
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
              <Trash weight="bold" />
              Delete
            </button>
          </div>
        </motion.div>

        {/* ── Search ── */}
        {collection.items.length > 3 && (
          <motion.div
            className="collection-view__search"
            initial={isMobile ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={isMobile ? {} : { delay: 0.2 }}
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
          initial={isMobile ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={isMobile ? {} : { delay: 0.15 }}
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
                  <Plus weight="bold" />
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
        onAdd={(data) => addItem(collection.id, data)}
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
    </div>
  );
}
