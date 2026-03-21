import { useState, useEffect, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { Trash2, Edit2 } from 'lucide-react';
import { ImageIcon } from '@phosphor-icons/react/Image';
import { DotsThreeIcon as DotsThree } from '@phosphor-icons/react/DotsThree';
import useStore from '../../store/useStore';
import useHasHover from '../../hooks/useHasHover';
import { timeAgo, isCloudUrl } from '../../utils/helpers';
import SafeImage from '../UI/SafeImage';
import './ItemCard.scss';

export default memo(function ItemCard({ item, collectionId, index = 0, onEdit, onExpand }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const deleteItem = useStore((s) => s.deleteItem);
  const getImageUrl = useStore((s) => s.getImageUrl);
  const hasHover = useHasHover();
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
    if (item.imageUrl) {
      getImageUrl(item.imageUrl).then((u) => {
        if (!mountedRef.current) {
          if (u && !isCloudUrl(u)) URL.revokeObjectURL(u);
          return;
        }
        if (u && !isCloudUrl(u)) blobUrl = u;
        setImageUrl(u);
      });
    } else {
      setImageUrl(null);
    }
    return () => {
      mountedRef.current = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.imageUrl]);

  const handleExpand = () => {
    if (!onExpand || !imageUrl) return;
    onExpand(item, imageUrl);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(item);
    setMenuOpen(false);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    deleteItem(collectionId, item.id);
    setMenuOpen(false);
  };

  return (
    <motion.div
      style={{ position: 'relative', zIndex: menuOpen ? 10 : 0 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: 'easeOut' }}
    >
      <Tilt
        tiltMaxAngleX={6}
        tiltMaxAngleY={6}
        glareEnable={hasHover}
        glareMaxOpacity={0.08}
        scale={1.02}
        transitionSpeed={300}
        tiltEnable={hasHover}
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
              metricContext="item-card"
            />
            {!imageUrl && (
              <div className="item-card__placeholder">
                <ImageIcon weight="thin" size={40} />
              </div>
            )}
          </div>

          <div ref={menuRef} className="item-card__menu-wrap">
            <button
              className="item-card__menu-btn"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            >
              <DotsThree weight="bold" size={20} />
            </button>
            {menuOpen && (
              <motion.div
                className="item-card__menu"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {onEdit && (
                  <button onClick={handleEdit}>
                    <Edit2 strokeWidth={2} size={14} /> Edit
                  </button>
                )}
                <button className="item-card__menu-danger" onClick={handleDelete}>
                  <Trash2 strokeWidth={2} size={14} /> Delete
                </button>
              </motion.div>
            )}
          </div>

          <div className="item-card__info">
            <h4 className="item-card__name">{item.name}</h4>
            {item.note && <p className="item-card__note">{item.note}</p>}
            <span className="item-card__time">{timeAgo(item.createdAt)}</span>
          </div>
        </div>
      </Tilt>
    </motion.div>
  );
})
