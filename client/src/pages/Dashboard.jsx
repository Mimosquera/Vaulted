import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Plus } from 'lucide-react';
import { MagnifyingGlassIcon as MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { FolderIcon as Folder } from '@phosphor-icons/react/Folder';
import { VaultIcon as Vault } from '@phosphor-icons/react/Vault';
import { ArrowsClockwiseIcon as ArrowsClockwise } from '@phosphor-icons/react/ArrowsClockwise';
import useStore, { CATEGORIES } from '../store/useStore';
import { CONFETTI_COLORS } from '../constants/colors';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import CollectionGrid from '../components/Collection/CollectionGrid';
import CreateCollectionModal from '../components/Modals/CreateCollectionModal';
import BlobBackground from '../components/UI/BlobBackground';
import AnimatedCounter from '../components/UI/AnimatedCounter';
import './Dashboard.scss';

export default function Dashboard() {
  const collections = useStore((s) => s.collections);
  const createCollection = useStore((s) => s.createCollection);
  const syncing = useStore((s) => s.syncingVisible);
  const syncToCloud = useStore((s) => s.syncToCloud);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const filtered = useMemo(() => {
    let result = collections;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
      );
    }
    if (filterCategory) {
      result = result.filter((c) => c.category === filterCategory);
    }
    return result;
  }, [collections, debouncedSearch, filterCategory]);

  const totalItems = useMemo(
    () => collections.reduce((sum, c) => sum + (c.items?.length || 0), 0),
    [collections]
  );

  const handleCreate = async (data, onProgress) => {
    await createCollection(data, onProgress);
    if (window.innerWidth >= 768) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: CONFETTI_COLORS,
      });
    }
  };

  return (
    <div className="dashboard page">
      <BlobBackground />
      <div className="container">

        {/* ── Header ── */}
        <motion.div
          className="dashboard__header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="dashboard__title-row">
            <div>
              <h1 className="dashboard__title">
                <Vault weight="duotone" className="dashboard__title-icon" />
                My Vault
              </h1>
              <p className="dashboard__subtitle">
                <AnimatedCounter value={collections.length} duration={800} /> collections &middot;{' '}
                <AnimatedCounter value={totalItems} duration={1000} /> items
              </p>
            </div>
            <div className="dashboard__actions">
              <button
                className={`dashboard__sync-btn ${syncing ? 'dashboard__sync-btn--syncing' : ''}`}
                onClick={syncToCloud}
                disabled={syncing}
                title="Sync to cloud"
              >
                <ArrowsClockwise weight="bold" size={18} />
                <span>{syncing ? 'Syncing...' : 'Sync'}</span>
              </button>
              <button
                className="btn btn--primary"
                onClick={() => setModalOpen(true)}
              >
                <Plus strokeWidth={2} size={16} />
                New Collection
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Search & Filter ── */}
        <motion.div
          className="dashboard__toolbar"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="dashboard__search">
            <MagnifyingGlass weight="bold" size={18} />
            <input
              type="text"
              placeholder="Search collections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="dashboard__filters">
            <button
              className={`dashboard__filter-chip ${!filterCategory ? 'dashboard__filter-chip--active' : ''}`}
              onClick={() => setFilterCategory('')}
            >
              All
            </button>
            {CATEGORIES.slice(0, 8).map((cat) => (
              <button
                key={cat.id}
                className={`dashboard__filter-chip ${filterCategory === cat.id ? 'dashboard__filter-chip--active' : ''}`}
                onClick={() => setFilterCategory(filterCategory === cat.id ? '' : cat.id)}
              >
                {cat.Icon && <cat.Icon weight="duotone" size={14} />} {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Grid ── */}
        {filtered.length > 0 ? (
          <CollectionGrid collections={filtered} />
        ) : (
          <motion.div
            className="dashboard__empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Folder weight="thin" size={64} />
            <h3>{search || filterCategory ? 'No matches found' : 'No collections yet'}</h3>
            <p>
              {search || filterCategory
                ? 'Try adjusting your search or filters.'
                : 'Start by creating your first collection!'}
            </p>
            {!search && !filterCategory && (
              <button
                className="btn btn--primary"
                onClick={() => setModalOpen(true)}
              >
                <Plus strokeWidth={2} size={16} />
                Create Collection
              </button>
            )}
          </motion.div>
        )}
      </div>

      <CreateCollectionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
