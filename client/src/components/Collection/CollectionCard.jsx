import { useState, useEffect, useRef, memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Tilt from 'react-parallax-tilt';
import { Trash2, Edit2 } from 'lucide-react';
import { FolderIcon as Folder } from '@phosphor-icons/react/Folder';
import { DotsThreeIcon as DotsThree } from '@phosphor-icons/react/DotsThree';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { EyeSlashIcon as EyeSlash } from '@phosphor-icons/react/EyeSlash';
import { UsersThreeIcon as UsersThree } from '@phosphor-icons/react/UsersThree';
import { UserIcon as User } from '@phosphor-icons/react/User';
import { timeAgo, isCloudUrl, getReturnPath } from '../../utils/helpers';
import { getCollectionGradient } from '../../constants/colors';
import CategoryIcon from '../UI/CategoryIcon';
import EditCollectionModal from '../Modals/EditCollectionModal';
import useStore from '../../store/useStore';
import useHasHover from '../../hooks/useHasHover';
import { getImageUrl as getImageUrlDirect } from '../../api/client';
import './CollectionCard.scss';

export default memo(function CollectionCard({ collection, index = 0, isVisitor = false }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState(null);
  const hasHover = useHasHover();
  const menuRef = useRef(null);
  const setCollectionVisibility = useStore((s) => s.setCollectionVisibility);
  const deleteCollection = useStore((s) => s.deleteCollection);
  const updateCollection = useStore((s) => s.updateCollection);
  const getImageUrl = useStore((s) => s.getImageUrl);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    mountedRef.current = true;
    let blobUrl = null;
    const imageRef = collection.coverImageUrl || collection.items?.find((i) => i.imageUrl);
    const imageId = typeof imageRef === 'string' ? imageRef : imageRef?.imageUrl;
    if (imageId) {
      if (isVisitor) {
        setCoverUrl(getImageUrlDirect(imageId));
      } else {
        getImageUrl(imageId).then((u) => {
          if (!mountedRef.current) {
            if (u && !isCloudUrl(u)) URL.revokeObjectURL(u);
            return;
          }
          if (u && !isCloudUrl(u)) blobUrl = u;
          setCoverUrl(u);
        });
      }
    } else {
      setCoverUrl(null);
    }
    return () => {
      mountedRef.current = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection.items, collection.coverImageUrl, isVisitor]);

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteCollection(collection.id);
    setMenuOpen(false);
  };

  const visibility = collection.visibility || (collection.isPublic ? 'public' : 'private');

  const handleSetVisibility = async (nextVisibility, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await setCollectionVisibility(collection.id, nextVisibility);
      const label = nextVisibility === 'friends_only'
        ? 'Friends only'
        : `${nextVisibility.charAt(0).toUpperCase()}${nextVisibility.slice(1)}`;
      toast.success(`Visibility set to ${label}`);
    } catch {
      toast.error('Unable to update visibility. Please try again.');
    } finally {
      setMenuOpen(false);
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditModalOpen(true);
    setMenuOpen(false);
  };

  const handleUpdateCollection = (collectionData) => {
    updateCollection(collection.id, collectionData);
    setEditModalOpen(false);
  };

  const linkTo = isVisitor ? `/explore/${collection.id}` : `/collection/${collection.id}`;
  const linkState = isVisitor ? { from: getReturnPath(location, '/explore') } : undefined;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ delay: index * 0.06, type: 'spring', stiffness: 100 }}
      >
        <Tilt
          tiltMaxAngleX={8}
          tiltMaxAngleY={8}
          glareEnable={hasHover}
          glareMaxOpacity={0.1}
          glarePosition="all"
          scale={1.02}
          transitionSpeed={400}
          tiltEnable={hasHover}
        >
          <Link to={linkTo} state={linkState} className="collection-card">
          <div
            className="collection-card__cover"
            style={{
              backgroundImage: coverUrl ? `url(${coverUrl})` : getCollectionGradient(collection.coverColor),
            }}
          >
            {!coverUrl && (
              <span className="collection-card__cover-icon">
                <CategoryIcon category={collection.category} size={40} />
              </span>
            )}
            <div className="collection-card__cover-overlay" />

            <div className="collection-card__badges">
              {visibility === 'public' && (
                <span className="collection-card__badge collection-card__badge--public">
                  <Eye weight="bold" size={12} /> Public
                </span>
              )}
              {visibility === 'friends_only' && (
                <span className="collection-card__badge collection-card__badge--public">
                  <UsersThree weight="bold" size={12} /> Friends
                </span>
              )}
            </div>

            {!isVisitor && (
              <div ref={menuRef}>
                <button
                  className="collection-card__menu-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                >
                  <DotsThree weight="bold" size={20} />
                </button>

                {menuOpen && (
                  <motion.div
                    className="collection-card__menu"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={(e) => e.preventDefault()}
                  >
                    <button onClick={handleEditClick}>
                      <Edit2 strokeWidth={2} size={14} /> Edit
                    </button>
                    <button onClick={(e) => handleSetVisibility('public', e)}>
                      <Eye size={16} /> Make Public
                    </button>
                    <button onClick={(e) => handleSetVisibility('friends_only', e)}>
                      <UsersThree size={16} /> Friends Only
                    </button>
                    <button onClick={(e) => handleSetVisibility('private', e)}>
                      <EyeSlash size={16} /> Make Private
                    </button>
                    <button className="collection-card__menu-danger" onClick={handleDelete}>
                      <Trash2 strokeWidth={2} size={14} /> Delete
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <div className="collection-card__info">
            <h3 className="collection-card__name">{collection.name}</h3>
            <div className="collection-card__meta">
              <span>
                <CategoryIcon category={collection.category} size={14} /> {collection.itemCount ?? collection.items?.length ?? 0} items
              </span>
              {isVisitor && collection.username ? (
                <span><User weight="bold" size={12} /> {collection.username}</span>
              ) : (
                <span>{timeAgo(collection.createdAt)}</span>
              )}
            </div>
            {collection.description && (
              <p className="collection-card__desc">{collection.description}</p>
            )}
          </div>
        </Link>
      </Tilt>
    </motion.div>

    {!isVisitor && (
      <EditCollectionModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onUpdate={handleUpdateCollection}
        collection={collection}
      />
    )}
    </>
  );
})
