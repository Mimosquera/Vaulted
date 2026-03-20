import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CompassIcon as Compass } from '@phosphor-icons/react/Compass';
import { MagnifyingGlassIcon as MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass';
import { SparkleIcon as Sparkle } from '@phosphor-icons/react/Sparkle';
import { UsersThreeIcon as UsersThree } from '@phosphor-icons/react/UsersThree';
import { UserPlusIcon as UserPlus } from '@phosphor-icons/react/UserPlus';
import { CheckIcon as Check } from '@phosphor-icons/react/Check';
import useStore, { CATEGORIES } from '../store/useStore';
import CollectionGrid from '../components/Collection/CollectionGrid';
import BlobBackground from '../components/UI/BlobBackground';
import UserAvatar, { getToneShade } from '../components/UI/UserAvatar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { getPublicProfileLinkState } from '../utils/helpers';
import './Explore.scss';

export default function Explore() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const publicCollectionsFromStore = useStore((s) => s.publicCollections);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const searchUsers = useStore((s) => s.searchUsers);
  const sendFriendRequest = useStore((s) => s.sendFriendRequest);
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const debouncedSearch = useDebouncedValue(search);
  const [filterCategory, setFilterCategory] = useState(() => searchParams.get('cat') || '');
  const [viewMode, setViewMode] = useState(() => (searchParams.get('view') === 'users' ? 'users' : 'collections'));
  const [users, setUsers] = useState([]);
  const [sendingRequestFor, setSendingRequestFor] = useState(null);

  // Fetch public collections when component mounts
  useEffect(() => {
    useStore.getState().fetchPublicCollections();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      params.set('q', trimmedSearch);
    }

    if (viewMode !== 'collections') {
      params.set('view', viewMode);
    }

    if (filterCategory && viewMode === 'collections') {
      params.set('cat', filterCategory);
    }

    setSearchParams(params, { replace: true });
  }, [search, filterCategory, viewMode, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || viewMode !== 'users' || !debouncedSearch?.trim()) {
      setUsers([]);
      return () => {
        cancelled = true;
      };
    }

    searchUsers(debouncedSearch).then((results) => {
      if (cancelled) return;
      setUsers(results || []);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, isAuthenticated, searchUsers, viewMode]);

  const publicCollections = useMemo(() => {
    let result = publicCollectionsFromStore;
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
  }, [publicCollectionsFromStore, debouncedSearch, filterCategory]);

  const friendsFeedCollections = useMemo(
    () => publicCollections.filter((c) => c.visibility === 'friends_only'),
    [publicCollections]
  );

  const nonFriendCollections = useMemo(
    () => publicCollections.filter((c) => c.visibility !== 'friends_only'),
    [publicCollections]
  );

  return (
    <div className="explore page">
      <BlobBackground color1="#667eea" color2="#764ba2" />
      <div className="container">

        <motion.div
          className="explore__header"
          initial={{ opacity: 0, y: 20 }}
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
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="explore__mode-switch">
            <button
              className={`explore__mode-btn ${viewMode === 'collections' ? 'explore__mode-btn--active' : ''}`}
              onClick={() => setViewMode('collections')}
            >
              <Compass weight="duotone" size={16} /> Collections
            </button>
            <button
              className={`explore__mode-btn ${viewMode === 'users' ? 'explore__mode-btn--active' : ''}`}
              onClick={() => setViewMode('users')}
            >
              <UsersThree weight="duotone" size={16} /> People
            </button>
          </div>

          <div className="explore__search">
            <MagnifyingGlass weight="bold" size={18} />
            <input
              type="text"
              placeholder={viewMode === 'users' ? 'Search users by username or email...' : 'Search collections...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {viewMode === 'collections' && (
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
          )}
        </motion.div>

        {viewMode === 'collections' && nonFriendCollections.length > 0 ? (
          <CollectionGrid collections={nonFriendCollections} isVisitor />
        ) : null}

        {viewMode === 'collections' && publicCollections.length === 0 && (
          <motion.div
            className="explore__empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Sparkle weight="thin" size={64} />
            <h3>No public collections yet</h3>
            <p>Collections marked as public will appear here. Go to your vault and toggle a collection to public!</p>
          </motion.div>
        )}

        {viewMode === 'users' && !isAuthenticated && (
          <motion.div className="explore__empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <UsersThree weight="thin" size={64} />
            <h3>Sign in to find friends</h3>
            <p>User discovery and friend requests are available for authenticated accounts.</p>
            <Link to="/login" className="btn btn--primary">Sign In</Link>
          </motion.div>
        )}

        {viewMode === 'users' && isAuthenticated && friendsFeedCollections.length > 0 && (
          <section className="explore__friends-feed">
            <div className="explore__friends-feed-header">
              <h2><UsersThree weight="duotone" size={18} /> Friends Feed</h2>
              <p>Private discoveries shared only with friends</p>
            </div>
            <CollectionGrid collections={friendsFeedCollections} isVisitor />
          </section>
        )}

        {viewMode === 'users' && isAuthenticated && (
          <div className="explore__users">
            {users.map((user) => {
              const userTone = getToneShade(user?.avatarIconColor || '#8b5cf6');

              return (
                <motion.div
                  key={user.id}
                  className="explore__user-card"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    '--avatar-icon-bg': userTone.bg,
                    '--avatar-icon-ring': userTone.ring,
                    '--avatar-icon-glow': userTone.glow,
                    '--avatar-icon-complement-glow': userTone.complementGlow,
                    '--avatar-icon-complement-soft': userTone.complementSoft,
                  }}
                >
                <div className="explore__user-main">
                  <div className="explore__user-avatar" aria-hidden="true">
                    <UserAvatar user={user} size={30} decorative />
                  </div>
                  <div className="explore__user-meta">
                    <h3>{user.username}</h3>
                    {user.bio && <p className="explore__user-bio">{user.bio}</p>}
                    <Link
                      to={`/u/${user.id}`}
                      state={getPublicProfileLinkState(location)}
                      className="explore__user-link"
                    >
                      View profile
                    </Link>
                  </div>
                </div>
                <button
                  className="btn btn--secondary btn--sm"
                  disabled={user.isFriend || user.hasPendingRequest || sendingRequestFor === user.id}
                  onClick={async () => {
                    setSendingRequestFor(user.id);
                    try {
                      await sendFriendRequest(user.id);
                      setUsers((prev) => prev.map((candidate) => (
                        candidate.id === user.id ? { ...candidate, hasPendingRequest: true } : candidate
                      )));
                    } finally {
                      setSendingRequestFor(null);
                    }
                  }}
                >
                  {user.isFriend ? <><Check weight="bold" size={14} /> Friends</> : null}
                  {!user.isFriend && user.hasPendingRequest ? <span className="explore__status-chip">Pending</span> : null}
                  {!user.isFriend && !user.hasPendingRequest ? <><UserPlus weight="bold" size={14} /> Add Friend</> : null}
                </button>
                </motion.div>
              );
            })}
            {debouncedSearch && users.length === 0 && (
              <div className="explore__empty">
                <h3>No users found</h3>
                <p>Try a different name or email.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
