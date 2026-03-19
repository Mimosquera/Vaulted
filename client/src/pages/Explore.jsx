import { useMemo, useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { CompassIcon as Compass } from '@phosphor-icons/react/Compass';
import { MagnifyingGlassIcon as MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { SparkleIcon as Sparkle } from '@phosphor-icons/react/Sparkle';
import useStore, { CATEGORIES } from '../store/useStore';
import CollectionGrid from '../components/Collection/CollectionGrid';
import BlobBackground from '../components/UI/BlobBackground';
import './Explore.scss';

export default function Explore() {
  const collections = useStore((s) => s.collections);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const publicCollections = useMemo(() => {
    let result = collections.filter((c) => c.isPublic);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
      );
    }
    if (filterCategory) {
      result = result.filter((c) => c.category === filterCategory);
    }
    return result;
  }, [collections, search, filterCategory]);

  return (
    <div className="explore page">
      <BlobBackground color1="#667eea" color2="#764ba2" />
      <div className="container">

        <motion.div
          className="explore__header"
          initial={isMobile ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>
            <Compass weight="duotone" className="explore__icon" />
            Explore
          </h1>
          <p>Discover collections shared by the community</p>
        </motion.div>

        <motion.div
          className="explore__toolbar"
          initial={isMobile ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={isMobile ? {} : { delay: 0.1 }}
        >
          <div className="explore__search">
            <MagnifyingGlass weight="bold" size={18} />
            <input
              type="text"
              placeholder="Search public collections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="explore__filters">
            <button
              className={`explore__filter-chip ${!filterCategory ? 'explore__filter-chip--active' : ''}`}
              onClick={() => setFilterCategory('')}
            >
              All
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`explore__filter-chip ${filterCategory === cat.id ? 'explore__filter-chip--active' : ''}`}
                onClick={() => setFilterCategory(filterCategory === cat.id ? '' : cat.id)}
              >
                {cat.Icon && <cat.Icon weight="duotone" size={14} />} {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {publicCollections.length > 0 ? (
          <CollectionGrid collections={publicCollections} />
        ) : (
          <motion.div
            className="explore__empty"
            initial={isMobile ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Sparkle weight="thin" size={64} />
            <h3>No public collections yet</h3>
            <p>Collections marked as public will appear here. Go to your vault and toggle a collection to public!</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
