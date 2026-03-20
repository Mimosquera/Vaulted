import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Masonry from 'react-masonry-css';
import { ArrowLeftIcon as ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { MagnifyingGlassIcon as MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { UserIcon as User } from '@phosphor-icons/react/User';
import { ImageIcon } from '@phosphor-icons/react/Image';
import { SpinnerGapIcon as SpinnerGap } from '@phosphor-icons/react/SpinnerGap';
import { fetchPublicCollection, getImageUrl } from '../api/client';
import BlobBackground from '../components/UI/BlobBackground';
import ItemLightbox from '../components/Collection/ItemLightbox';
import CategoryIcon from '../components/UI/CategoryIcon';
import { getCategoryLabel, timeAgo } from '../utils/helpers';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import './CollectionView.scss';

const MASONRY_COLS = { default: 4, 1100: 3, 700: 2 };

function PublicItemCard({ item, index = 0, onExpand }) {
  const imageUrl = item.imageUrl ? getImageUrl(item.imageUrl) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 120, damping: 14 }}
      layout
    >
      <div className="item-card">
        <div className="item-card__image" onClick={() => onExpand && onExpand(item, imageUrl)} style={{ cursor: 'pointer' }}>
          {imageUrl ? (
            <img src={imageUrl} alt={item.name} loading="lazy" />
          ) : (
            <div className="item-card__placeholder">
              <ImageIcon weight="thin" size={40} />
            </div>
          )}
        </div>
        <div className="item-card__info">
          <h4 className="item-card__name">{item.name}</h4>
          {item.note && <p className="item-card__note">{item.note}</p>}
          <span className="item-card__time">{timeAgo(item.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function PublicCollectionView() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  const handleExpandItem = (item, imageUrl) => {
    setLightboxItem(item);
    setLightboxImageUrl(imageUrl);
  };  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPublicCollection(id)
      .then((data) => setCollection(data))
      .catch(() => setError('Collection not found or is private'))
      .finally(() => setLoading(false));
  }, [id]);

  const filteredItems = useMemo(() => {
    if (!collection?.items) return [];
    if (!debouncedSearch) return collection.items;
    const q = debouncedSearch.toLowerCase();
    return collection.items.filter(
      (item) => item.name.toLowerCase().includes(q) || item.note?.toLowerCase().includes(q)
    );
  }, [collection, debouncedSearch]);

  if (loading) {
    return (
      <div className="collection-view page">
        <div className="container">
          <div className="collection-view__not-found">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <SpinnerGap weight="bold" size={40} />
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="collection-view page">
        <div className="container">
          <div className="collection-view__not-found">
            <h2>{error || 'Collection not found'}</h2>
            <Link to="/explore" className="btn btn--secondary">
              <ArrowLeft weight="bold" />
              Back to Explore
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="collection-view page">
      <BlobBackground color1={collection.coverColor || '#7c3aed'} />
      <div className="container">

        <motion.div
          className="collection-view__hero"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to="/explore" className="collection-view__back">
            <ArrowLeft weight="bold" size={18} />
            Back to Explore
          </Link>

          <div className="collection-view__hero-info">
            <motion.div
              className="collection-view__icon"
              style={{ backgroundColor: `${collection.coverColor || '#7c3aed'}20` }}
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CategoryIcon category={collection.category} size={40} />
            </motion.div>

            <div className="collection-view__hero-text">
              <div className="collection-view__category">
                {getCategoryLabel(collection.category)}
                <span className="collection-view__public-badge">
                  <Eye weight="bold" size={12} /> Public
                </span>
              </div>
              <h1>{collection.name}</h1>
              {collection.description && <p>{collection.description}</p>}
              <div className="collection-view__visitor-meta">
                <span className="collection-view__owner">
                  <User weight="bold" size={14} /> {collection.username}
                </span>
                <span className="collection-view__count">
                  {collection.items.length} {collection.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

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
                  <PublicItemCard key={item.id} item={item} index={i} onExpand={handleExpandItem} />
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
              <h3>{search ? 'No items match your search' : 'This collection is empty'}</h3>
              <p>{search ? 'Try a different search.' : 'The owner hasn\'t added any items yet.'}</p>
            </div>
          )}
        </motion.div>
      </div>

      <ItemLightbox
        item={lightboxItem}
        imageUrl={lightboxImageUrl}
        isOpen={!!lightboxItem}
        onClose={() => { setLightboxItem(null); setLightboxImageUrl(null); }}
      />
    </div>
  );
}
