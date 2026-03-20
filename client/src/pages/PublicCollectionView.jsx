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
import ItemLightbox from '../components/Collection/ItemLightbox';
import BlobBackground from '../components/UI/BlobBackground';
import CategoryIcon from '../components/UI/CategoryIcon';
import SafeImage from '../components/UI/SafeImage';
import '../components/Collection/ItemCard.scss';
import { getCategoryLabel, isCloudUrl, optimizeImageUrl, timeAgo } from '../utils/helpers';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import useStore from '../store/useStore';
import './CollectionView.scss';

const MASONRY_COLS = { default: 4, 1100: 3, 700: 2 };

function PublicItemCard({ item, index = 0, onExpand }) {
  const imageUrl = item.imageUrl ? getImageUrl(item.imageUrl) : null;
  const handleExpand = () => {
    if (!onExpand || !imageUrl) return;
    onExpand(item, imageUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: 'easeOut' }}
    >
      <div className="item-card">
        <div className="item-card__image" onClick={handleExpand} style={{ cursor: 'pointer' }}>
          <SafeImage
            src={imageUrl}
            alt={item.name}
            aspectRatio="1 / 1"
            wrapperClassName="item-card__media"
            imageClassName="item-card__media-img"
            widthHint={360}
          />

          {!imageUrl && (
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
  const prefetchImages = useStore((s) => s.prefetchImages);
  const [collection, setCollection] = useState(null);
  const [errorById, setErrorById] = useState({ id: null, message: null });
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [lightboxItem, setLightboxItem] = useState(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState(null);

  const handleExpandItem = (item, imageUrl) => {
    setLightboxItem(item);
    setLightboxImageUrl(imageUrl);
  };

  useEffect(() => {
    let cancelled = false;

    fetchPublicCollection(id)
      .then((data) => {
        if (cancelled) return;
        setCollection(data);
        setErrorById({ id: null, message: null });
      })
      .catch(() => {
        if (cancelled) return;
        setCollection(null);
        setErrorById({ id, message: 'Collection not found or is private' });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const currentError = errorById.id === id ? errorById.message : null;
  const loading = !currentError && (!collection || String(collection.id) !== String(id));

  const filteredItems = useMemo(() => {
    if (!collection?.items) return [];
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
      { limit: 10 }
    );
  }, [filteredItems, prefetchImages]);

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

  if (currentError) {
    return (
      <div className="collection-view page">
        <div className="container">
          <div className="collection-view__not-found">
            <h2>{currentError}</h2>
            <Link to="/explore" className="btn btn--secondary">
              <ArrowLeft weight="bold" />
              Back to Explore
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const coverColor = collection.coverColor || '#7c3aed';
  const coverUrl = isCloudUrl(collection.coverImageUrl) ? collection.coverImageUrl : null;
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
          <Link to="/explore" className="collection-view__back">
            <ArrowLeft weight="bold" size={18} />
            Back
          </Link>
        </div>

        <div className="collection-view__cover-content container">
          <div className="collection-view__category">
            <CategoryIcon category={collection.category} size={16} />
            {getCategoryLabel(collection.category)}
            <span className="collection-view__public-badge">
              <Eye weight="bold" size={11} /> Public
            </span>
          </div>
          <h1 className="collection-view__title">{collection.name}</h1>
          {collection.description && (
            <p className="collection-view__desc">{collection.description}</p>
          )}
          <div className="collection-view__visitor-meta">
            <span className="collection-view__owner">
              <User weight="bold" size={14} /> {collection.username}
            </span>
            <span className="collection-view__count">
              {collection.items.length} {collection.items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Content ── */}
      <div className="container">
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
