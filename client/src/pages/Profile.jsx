import { useRef, useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Edit2, Check } from 'lucide-react';
import { PaintBrushIcon as PaintBrush } from '@phosphor-icons/react/PaintBrush';
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
import UserAvatar, { getToneShade } from '../components/UI/UserAvatar';
import ImageUploader from '../components/Upload/ImageUploader';
import { uploadImageAPI } from '../api/client';
import { AVATAR_THEME_COLORS } from '../constants/colors';
import { getPublicProfileLinkState } from '../utils/helpers';
import './Profile.scss';

export default function Profile() {
  const location = useLocation();
  const avatarColorOptions = AVATAR_THEME_COLORS;
  const username = useStore((s) => s.username);
  const setUsername = useStore((s) => s.setUsername);
  const updateUserProfile = useStore((s) => s.updateUserProfile);
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
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatarIconColor || '#8b5cf6');
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarMode, setAvatarMode] = useState(user?.avatarImageUrl ? 'image' : 'icon');
  const [bioFocused, setBioFocused] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [pendingAvatarFile, setPendingAvatarFile] = useState(null);
    const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
    const [uploaderKey, setUploaderKey] = useState(0);
    const shellTone = useMemo(() => getToneShade(avatarColor), [avatarColor]);
  const publicProfileLinkState = getPublicProfileLinkState(location, '/profile');
  const avatarEditorRef = useRef(null);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    setNameInput(username);
  }, [username]);

  useEffect(() => {
    setBioInput(user?.bio || '');
    setAvatarColor(user?.avatarIconColor || '#8b5cf6');
    setAvatarMode(user?.avatarImageUrl ? 'image' : 'icon');
  }, [user]);

  useEffect(() => {
    if (!avatarEditorOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!avatarEditorRef.current) return;
      if (!avatarEditorRef.current.contains(event.target)) {
        setAvatarEditorOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [avatarEditorOpen]);

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

  const hasBioChanges = (bioInput.trim() || '') !== (user?.bio || '');

  const handleSaveProfile = async () => {
    if (!hasBioChanges || savingProfile) return;

    setSavingProfile(true);
    try {
      await updateUserProfile({ bio: bioInput.trim() });
      toast.success('Profile updated');
    } catch {
      toast.error('Unable to save profile right now');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!pendingAvatarFile || uploadingAvatar) return;

    setUploadingAvatar(true);
    try {
      const upload = await uploadImageAPI(pendingAvatarFile, (pct) => setAvatarUploadProgress(pct));
      await updateUserProfile({ avatarImageUrl: upload.url });
      setAvatarMode('image');
      setPendingAvatarFile(null);
      setUploaderKey((k) => k + 1);
      toast.success('Profile photo updated');
    } catch {
      toast.error('Unable to upload that image. Try another file.');
    } finally {
      setUploadingAvatar(false);
      setAvatarUploadProgress(0);
    }
  };

  const handleAvatarFileSelect = (file) => {
    if (file) {
      setPendingAvatarFile(file);
    } else if (pendingAvatarFile) {
      // User cancelled new selection via X — reset uploader to show existing avatar
      setPendingAvatarFile(null);
      setUploaderKey((k) => k + 1);
    } else {
      // User removed the currently-displayed photo — clear from server
      handleUseIcon();
    }
  };

  const handleIconTabClick = () => {
    if (pendingAvatarFile) {
      setPendingAvatarFile(null);
      setUploaderKey((k) => k + 1);
      setAvatarMode('icon');
    } else if (avatarMode !== 'icon') {
      handleUseIcon();
    }
  };

  const handleUseIcon = async () => {
    setSavingProfile(true);
    try {
      await updateUserProfile({ avatarImageUrl: null });
      setAvatarMode('icon');
      toast.success('Using icon avatar');
    } catch {
      toast.error('Unable to update avatar');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarColorSelect = async (color) => {
    if (color === avatarColor || savingProfile) return;
    setAvatarColor(color);

    try {
      await updateUserProfile({ avatarIconColor: color });
    } catch {
      toast.error('Unable to update icon color');
      setAvatarColor(user?.avatarIconColor || '#8b5cf6');
    }
  };

  const getAvatarToneStyle = (avatarIconColor) => {
    const tone = getToneShade(avatarIconColor || '#8b5cf6');
    return {
      '--avatar-icon-bg': tone.bg,
      '--avatar-icon-ring': tone.ring,
      '--avatar-icon-glow': tone.glow,
      '--avatar-icon-complement-glow': tone.complementGlow,
      '--avatar-icon-complement-soft': tone.complementSoft,
    };
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
          <div
            ref={avatarEditorRef}
            className="profile__avatar-editor-shell"
            style={{
              '--avatar-icon-bg': shellTone.bg,
              '--avatar-icon-ring': shellTone.ring,
              '--avatar-icon-glow': shellTone.glow,
              '--avatar-icon-complement-glow': shellTone.complementGlow,
              '--avatar-icon-complement-soft': shellTone.complementSoft,
            }}
          >
            <motion.div className="profile__avatar-wrap" whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300 }}>
              <div className="profile__avatar">
                <UserAvatar user={user} size={96} alt={`${username} avatar`} />
              </div>
              <button
                type="button"
                className="profile__avatar-edit-trigger"
                onClick={() => setAvatarEditorOpen((open) => !open)}
                disabled={savingProfile || uploadingAvatar}
              >
                <Edit2 strokeWidth={2} size={13} /> Edit avatar
              </button>
            </motion.div>

            <div
              className={`profile__avatar-editor ${avatarEditorOpen ? 'profile__avatar-editor--open' : ''}`}
              style={avatarEditorOpen ? { '--editor-max-h': avatarMode === 'image' ? '520px' : '240px' } : {}}
            >
              <div className="profile__avatar-mode-switch" role="tablist" aria-label="Avatar mode">
                <button
                  type="button"
                  className={`profile__avatar-mode-btn ${avatarMode === 'image' ? 'profile__avatar-mode-btn--active' : ''}`}
                  onClick={() => setAvatarMode('image')}
                >
                  Photo
                </button>
                <button
                  type="button"
                  className={`profile__avatar-mode-btn ${avatarMode === 'icon' ? 'profile__avatar-mode-btn--active' : ''}`}
                    onClick={handleIconTabClick}
                  disabled={savingProfile || uploadingAvatar}
                >
                  Icon
                </button>
              </div>
              {avatarMode === 'image' ? (
                <div className="profile__avatar-uploader-wrap">
                  <ImageUploader
                    key={uploaderKey}
                    currentPreview={user?.avatarImageUrl || null}
                    onFileSelect={handleAvatarFileSelect}
                    isUploading={uploadingAvatar}
                    uploadProgress={avatarUploadProgress}
                    cropShape="circle"
                  />
                  {pendingAvatarFile && !uploadingAvatar && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm profile__avatar-confirm-btn"
                      onClick={handleAvatarUpload}
                    >
                      Set as avatar
                    </button>
                  )}
                </div>
              ) : (
                <div className="profile__avatar-color-row">
                  <span className="profile__avatar-color-label"><PaintBrush weight="duotone" size={14} /> Icon color</span>
                  <div className="profile__avatar-swatch-list" role="radiogroup" aria-label="Avatar icon color">
                    {avatarColorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`profile__avatar-swatch ${avatarColor === color ? 'profile__avatar-swatch--active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleAvatarColorSelect(color)}
                        aria-label={`Use ${color} avatar color`}
                        aria-pressed={avatarColor === color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

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
          <div className="profile__bio-row">
            <input
              id="profile-bio"
              className="profile__bio-input"
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value.slice(0, 180))}
              onFocus={() => setBioFocused(true)}
              onBlur={() => setBioFocused(false)}
              placeholder="Bio (optional)"
            />
            {bioFocused && (
              <div className="profile__bio-actions">
                <span className="profile__bio-count">{bioInput.length}/180</span>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleSaveProfile}
                  disabled={!hasBioChanges || savingProfile || uploadingAvatar}
                >
                  {savingProfile ? 'Saving...' : 'Save'}
                </button>
              </div>
            )}
          </div>
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
                    <span className="profile__friend-avatar" aria-hidden="true" style={getAvatarToneStyle(friend.user?.avatarIconColor)}>
                      <UserAvatar user={friend.user} size={26} decorative />
                    </span>
                    <div className="profile__friend-meta">
                      <Link to={`/u/${friend.user.id}`} state={publicProfileLinkState} className="profile__friend-name">{friend.user.username}</Link>
                      <span className="profile__friend-subtext">{friend.user.bio?.trim() || 'Connected'}</span>
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
                    <span className="profile__friend-avatar" aria-hidden="true" style={getAvatarToneStyle(request.user?.avatarIconColor)}>
                      <UserAvatar user={request.user} size={26} decorative />
                    </span>
                    <div className="profile__friend-meta">
                      <Link to={`/u/${request.user.id}`} state={publicProfileLinkState} className="profile__friend-name">{request.user.username}</Link>
                      <span className="profile__friend-subtext">{request.user.bio?.trim() || 'Wants to connect'}</span>
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
                    <span className="profile__friend-avatar" aria-hidden="true" style={getAvatarToneStyle(request.user?.avatarIconColor)}>
                      <UserAvatar user={request.user} size={26} decorative />
                    </span>
                    <div className="profile__friend-meta">
                      <Link to={`/u/${request.user.id}`} state={publicProfileLinkState} className="profile__friend-name">{request.user.username}</Link>
                      <span className="profile__friend-subtext">{request.user.bio?.trim() || 'Awaiting response'}</span>
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
