import { useState, useMemo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { UserCircleIcon as UserCircle } from '@phosphor-icons/react/UserCircle';
import { PencilSimpleIcon as PencilSimple } from '@phosphor-icons/react/PencilSimple';
import { CheckIcon as Check } from '@phosphor-icons/react/Check';
import { FolderIcon as Folder } from '@phosphor-icons/react/Folder';
import { PackageIcon as Package } from '@phosphor-icons/react/Package';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { ChartBarIcon as ChartBar } from '@phosphor-icons/react/ChartBar';
import { EnvelopeSimpleIcon as EnvelopeSimple } from '@phosphor-icons/react/EnvelopeSimple';
import { ArrowsClockwiseIcon as ArrowsClockwise } from '@phosphor-icons/react/ArrowsClockwise';
import useStore from '../store/useStore';
import BlobBackground from '../components/UI/BlobBackground';
import AnimatedCounter from '../components/UI/AnimatedCounter';
import CategoryIcon from '../components/UI/CategoryIcon';
import './Profile.scss';

export default function Profile() {
  const { username, setUsername, collections, user, syncing, lastSynced, syncToCloud } = useStore();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(username);

  const stats = useMemo(() => {
    const totalItems = collections.reduce((sum, c) => sum + (c.items?.length || 0), 0);
    const publicCount = collections.filter((c) => c.isPublic).length;
    const categoryCounts = {};
    collections.forEach((c) => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    return { totalItems, publicCount, topCategory };
  }, [collections]);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      setUsername(nameInput.trim());
    }
    setEditing(false);
  };

  return (
    <div className="profile page">
      <BlobBackground color1="#b91c1c" color2="#92400e" />
      <div className="container">

        <motion.div
          className="profile__header"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.div
            className="profile__avatar"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <UserCircle weight="duotone" size={90} />
          </motion.div>

          <div className="profile__name-row">
            {editing ? (
              <div className="profile__name-edit">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={30}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button className="profile__name-save" onClick={handleSaveName}>
                  <Check weight="bold" size={18} />
                </button>
              </div>
            ) : (
              <div className="profile__name-display">
                <h1>{username}</h1>
                <button className="profile__name-edit-btn" onClick={() => setEditing(true)}>
                  <PencilSimple weight="bold" size={16} />
                </button>
              </div>
            )}
          </div>
          <p className="profile__tagline">Curating since {new Date().getFullYear()}</p>
          {user && (
            <div className="profile__account">
              <span className="profile__email">
                <EnvelopeSimple weight="duotone" size={14} />
                {user.email}
              </span>
              <button
                className="btn btn--ghost btn--sm"
                onClick={syncToCloud}
                disabled={syncing}
              >
                <ArrowsClockwise weight="bold" className={syncing ? 'spin' : ''} />
                {syncing ? 'Syncing...' : lastSynced ? `Last synced ${new Date(lastSynced).toLocaleTimeString()}` : 'Sync Now'}
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Stats Cards ── */}
        <motion.div
          className="profile__stats"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="profile__stat-card">
            <div className="profile__stat-icon" style={{ color: '#7c3aed', background: 'rgba(124,58,237,0.1)' }}>
              <Folder weight="duotone" size={24} />
            </div>
            <div className="profile__stat-value"><AnimatedCounter value={collections.length} /></div>
            <div className="profile__stat-label">Collections</div>
          </div>

          <div className="profile__stat-card">
            <div className="profile__stat-icon" style={{ color: '#2563eb', background: 'rgba(37,99,235,0.1)' }}>
              <Package weight="duotone" size={24} />
            </div>
            <div className="profile__stat-value"><AnimatedCounter value={stats.totalItems} /></div>
            <div className="profile__stat-label">Total Items</div>
          </div>

          <div className="profile__stat-card">
            <div className="profile__stat-icon" style={{ color: '#16a34a', background: 'rgba(22,163,74,0.1)' }}>
              <Eye weight="duotone" size={24} />
            </div>
            <div className="profile__stat-value"><AnimatedCounter value={stats.publicCount} /></div>
            <div className="profile__stat-label">Public</div>
          </div>

          <div className="profile__stat-card">
            <div className="profile__stat-icon" style={{ color: '#9333ea', background: 'rgba(147,51,234,0.1)' }}>
              <ChartBar weight="duotone" size={24} />
            </div>
            <div className="profile__stat-value">
              {stats.topCategory ? <CategoryIcon category={stats.topCategory[0]} size={28} /> : '-'}
            </div>
            <div className="profile__stat-label">Top Category</div>
          </div>
        </motion.div>

        {/* ── Collection Breakdown ── */}
        <motion.div
          className="profile__breakdown"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2>Collection Breakdown</h2>
          <div className="profile__breakdown-list">
            {collections.length > 0 ? (
              collections.map((col, i) => (
                <motion.div
                  key={col.id}
                  className="profile__breakdown-item"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                >
                  <div className="profile__breakdown-info">
                    <span className="profile__breakdown-icon"><CategoryIcon category={col.category} size={18} /></span>
                    <span className="profile__breakdown-name">{col.name}</span>
                    {col.isPublic && (
                      <span className="profile__breakdown-public">Public</span>
                    )}
                  </div>
                  <span className="profile__breakdown-count">{col.items?.length || 0} items</span>
                </motion.div>
              ))
            ) : (
              <p className="profile__breakdown-empty">No collections yet. Start building your vault!</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
