import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeftIcon as ArrowLeft } from '@phosphor-icons/react/ArrowLeft';
import { UserPlusIcon as UserPlus } from '@phosphor-icons/react/UserPlus';
import { UsersThreeIcon as UsersThree } from '@phosphor-icons/react/UsersThree';
import { UserMinusIcon as UserMinus } from '@phosphor-icons/react/UserMinus';
import useStore from '../store/useStore';
import { fetchPublicProfileAPI } from '../api/client';
import CollectionGrid from '../components/Collection/CollectionGrid';
import BlobBackground from '../components/UI/BlobBackground';
import UserAvatar, { getToneShade } from '../components/UI/UserAvatar';
import './PublicProfile.scss';

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const sendFriendRequest = useStore((s) => s.sendFriendRequest);
  const removeFriend = useStore((s) => s.removeFriend);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPublicProfileAPI(userId)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setRequestSent(data.friendshipStatus === 'pending_outgoing');
      })
      .catch(() => {
        if (cancelled) return;
        setError('Profile not found');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const visibleCollections = useMemo(() => profile?.collections || [], [profile]);

  if (loading) {
    return <div className="public-profile page"><div className="container"><p>Loading profile...</p></div></div>;
  }

  if (error || !profile) {
    return (
      <div className="public-profile page">
        <div className="container public-profile__empty">
          <h2>{error || 'Profile unavailable'}</h2>
          <Link to="/explore" className="btn btn--secondary">
            <ArrowLeft weight="bold" size={16} /> Back to Explore
          </Link>
        </div>
      </div>
    );
  }

  const friendshipStatus = profile.friendshipStatus || 'none';
  const showAddButton = isAuthenticated && !profile.isSelf && friendshipStatus === 'none' && !requestSent;
  const showRemoveButton = isAuthenticated && !profile.isSelf && (profile.isFriend || friendshipStatus === 'accepted');
  const profileTone = getToneShade(profile.user?.avatarIconColor || '#8b5cf6');
  const profileBio = (profile.user?.bio || '').trim();

  const handleBack = () => {
    navigate(location.state?.from || '/explore');
  };

  return (
    <div className="public-profile page">
      <BlobBackground color1="#312e81" color2="#5b21b6" />
      <div className="container">
        <div className="public-profile__topbar">
          <button type="button" className="public-profile__back-link" onClick={handleBack}>
            <ArrowLeft weight="bold" size={14} /> Back
          </button>
        </div>

        <motion.div
          className="public-profile__header"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            '--avatar-icon-bg': profileTone.bg,
            '--avatar-icon-ring': profileTone.ring,
            '--avatar-icon-glow': profileTone.glow,
            '--avatar-icon-complement-glow': profileTone.complementGlow,
            '--avatar-icon-complement-soft': profileTone.complementSoft,
          }}
        >
          <div className="public-profile__identity">
            <div className="public-profile__avatar">
              <UserAvatar user={profile.user} size={72} alt={`${profile.user.username} avatar`} />
            </div>
            <div>
              <h1>{profile.user.username}</h1>
              {profileBio ? <p className="public-profile__bio">{profileBio}</p> : null}
              <p>{visibleCollections.length} visible collection{visibleCollections.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="public-profile__actions">
            {showAddButton && (
              <button
                className="btn btn--secondary"
                onClick={async () => {
                  setSendingRequest(true);
                  try {
                    await sendFriendRequest(profile.user.id);
                    setRequestSent(true);
                    setProfile((prev) => (prev ? { ...prev, friendshipStatus: 'pending_outgoing' } : prev));
                    toast.success('Friend request sent');
                  } catch {
                    toast.error('Unable to send friend request. Please try again.');
                  } finally {
                    setSendingRequest(false);
                  }
                }}
                disabled={sendingRequest}
              >
                <UserPlus weight="bold" size={16} /> {sendingRequest ? 'Sending...' : 'Add Friend'}
              </button>
            )}

            {showRemoveButton && (
              <button
                className="btn btn--ghost"
                onClick={async () => {
                  try {
                    await removeFriend(profile.user.id);
                    setProfile((prev) => (prev ? { ...prev, isFriend: false, friendshipStatus: 'none' } : prev));
                    setRequestSent(false);
                    toast.success('Friend removed');
                  } catch {
                    toast.error('Unable to remove friend right now.');
                  }
                }}
              >
                <UserMinus weight="bold" size={16} /> Remove Friend
              </button>
            )}

            {(profile.isFriend || friendshipStatus === 'accepted') && !showRemoveButton && (
              <span className="public-profile__friend-badge"><UsersThree weight="fill" size={16} /> Friends</span>
            )}

            {friendshipStatus === 'pending_outgoing' && (
              <span className="public-profile__friend-badge public-profile__friend-badge--pending">
                <UserPlus weight="fill" size={16} /> Request Sent
              </span>
            )}

            {friendshipStatus === 'pending_incoming' && (
              <span className="public-profile__friend-badge public-profile__friend-badge--pending">
                <UsersThree weight="fill" size={16} /> Sent You a Request
              </span>
            )}
          </div>
        </motion.div>

        {visibleCollections.length > 0 ? (
          <CollectionGrid collections={visibleCollections} isVisitor />
        ) : (
          <div className="public-profile__empty">
            <h3>No visible collections</h3>
            <p>This profile currently has no public collections available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
