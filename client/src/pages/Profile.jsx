import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit2, Check } from 'lucide-react';
import { UserCircleIcon as UserCircle } from '@phosphor-icons/react/UserCircle';
import { FolderIcon as Folder } from '@phosphor-icons/react/Folder';
import { PackageIcon as Package } from '@phosphor-icons/react/Package';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { ChartBarIcon as ChartBar } from '@phosphor-icons/react/ChartBar';
import { EnvelopeSimpleIcon as EnvelopeSimple } from '@phosphor-icons/react/EnvelopeSimple';
import { ArrowsClockwiseIcon as ArrowsClockwise } from '@phosphor-icons/react/ArrowsClockwise';
import { UsersThreeIcon as UsersThree } from '@phosphor-icons/react/UsersThree';
import { UserMinusIcon as UserMinus } from '@phosphor-icons/react/UserMinus';
import useStore from '../store/useStore';
import BlobBackground from '../components/UI/BlobBackground';
import AnimatedCounter from '../components/UI/AnimatedCounter';
import CategoryIcon from '../components/UI/CategoryIcon';
import './Profile.scss';

export default function Profile() {
  const username = useStore((s) => s.username);
  const setUsername = useStore((s) => s.setUsername);
  const collections = useStore((s) => s.collections);
  const user = useStore((s) => s.user);
  const syncing = useStore((s) => s.syncingVisible);
  const lastSynced = useStore((s) => s.lastSynced);
  const syncToCloud = useStore((s) => s.syncToCloud);
  const friends = useStore((s) => s.friends);
  const incomingFriendRequests = useStore((s) => s.incomingFriendRequests);
  const outgoingFriendRequests = useStore((s) => s.outgoingFriendRequests);
  const fetchFriends = useStore((s) => s.fetchFriends);
  const acceptFriendRequest = useStore((s) => s.acceptFriendRequest);
  const rejectFriendRequest = useStore((s) => s.rejectFriendRequest);
  const removeFriend = useStore((s) => s.removeFriend);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(username);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

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
                  <Check strokeWidth={2} size={14} />
                </button>
              </div>
            ) : (
              <div className="profile__name-display">
                <h1>{username}</h1>
                <button className="profile__name-edit-btn" onClick={() => setEditing(true)}>
                  <Edit2 strokeWidth={2} size={14} />
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

        <motion.div
          className="profile__friends"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="profile__friends-head">
            <h2><UsersThree weight="duotone" size={18} /> Friends Network</h2>
            <div className="profile__friends-summary" aria-label="Friendship stats">
              <span className="profile__friends-stat">{friends.length} friends</span>
              <span className="profile__friends-stat">{incomingFriendRequests.length} incoming</span>
              <span className="profile__friends-stat">{outgoingFriendRequests.length} sent</span>
            </div>
          </div>

          <div className="profile__friend-grid">
            <div className="profile__friend-panel">
              <h3>
                Friends
                <span className="profile__panel-count">{friends.length}</span>
              </h3>
              {friends.length === 0 ? <p className="profile__muted">No friends yet</p> : friends.map((friend) => (
                <div key={friend.id} className="profile__friend-row">
                  <div className="profile__friend-user">
                    <span className="profile__friend-avatar" aria-hidden="true">
                      <UserCircle weight="duotone" size={24} />
                    </span>
                    <div className="profile__friend-meta">
                      <Link to={`/u/${friend.user.id}`} className="profile__friend-name">{friend.user.username}</Link>
                      <span className="profile__friend-subtext">Connected</span>
                    </div>
                  </div>
                  <button className="btn btn--ghost btn--sm" onClick={() => removeFriend(friend.user.id)}>
                    <UserMinus weight="bold" size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="profile__friend-panel">
              <h3>
                Incoming Requests
                <span className="profile__panel-count">{incomingFriendRequests.length}</span>
              </h3>
              {incomingFriendRequests.length === 0 ? <p className="profile__muted">No pending requests</p> : incomingFriendRequests.map((request) => (
                <div key={request.id} className="profile__friend-row">
                  <div className="profile__friend-user">
                    <span className="profile__friend-avatar" aria-hidden="true">
                      <UserCircle weight="duotone" size={24} />
                    </span>
                    <div className="profile__friend-meta">
                      <Link to={`/u/${request.user.id}`} className="profile__friend-name">{request.user.username}</Link>
                      <span className="profile__friend-subtext">Wants to connect</span>
                    </div>
                  </div>
                  <div className="profile__friend-actions">
                    <button className="btn btn--secondary btn--sm" onClick={() => acceptFriendRequest(request.id)}>Accept</button>
                    <button className="btn btn--ghost btn--sm" onClick={() => rejectFriendRequest(request.id)}>Decline</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="profile__friend-panel">
              <h3>
                Sent Requests
                <span className="profile__panel-count">{outgoingFriendRequests.length}</span>
              </h3>
              {outgoingFriendRequests.length === 0 ? <p className="profile__muted">No outgoing requests</p> : outgoingFriendRequests.map((request) => (
                <div key={request.id} className="profile__friend-row">
                  <div className="profile__friend-user">
                    <span className="profile__friend-avatar" aria-hidden="true">
                      <UserCircle weight="duotone" size={24} />
                    </span>
                    <div className="profile__friend-meta">
                      <Link to={`/u/${request.user.id}`} className="profile__friend-name">{request.user.username}</Link>
                      <span className="profile__friend-subtext">Awaiting response</span>
                    </div>
                  </div>
                  <span className="profile__pending">Pending</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
