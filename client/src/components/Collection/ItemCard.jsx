import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { TrashIcon as Trash } from '@phosphor-icons/react/Trash';
import { PencilSimpleIcon as PencilSimple } from '@phosphor-icons/react/PencilSimple';
import { ImageIcon } from '@phosphor-icons/react/Image';
import useStore from '../../store/useStore';
import { timeAgo } from '../../utils/helpers';
import './ItemCard.scss';

export default function ItemCard({ item, collectionId, index = 0, onEdit }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [hovering, setHovering] = useState(false);
  const deleteItem = useStore((s) => s.deleteItem);
  const getImageUrl = useStore((s) => s.getImageUrl);

  useEffect(() => {
    let url = null;
    if (item.imageUrl) {
      getImageUrl(item.imageUrl).then((u) => {
        url = u;
        setImageUrl(u);
      });
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.imageUrl]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 120, damping: 14 }}
      layout
    >
      <Tilt
        tiltMaxAngleX={6}
        tiltMaxAngleY={6}
        glareEnable
        glareMaxOpacity={0.08}
        scale={1.02}
        transitionSpeed={300}
      >
        <div
          className="item-card"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <div className="item-card__image">
            {imageUrl ? (
              <img src={imageUrl} alt={item.name} loading="lazy" />
            ) : (
              <div className="item-card__placeholder">
                <ImageIcon weight="thin" size={40} />
              </div>
            )}

            <motion.div
              className="item-card__actions"
              initial={false}
              animate={{ opacity: hovering ? 1 : 0 }}
              transition={{ duration: 0.15 }}
            >
              {onEdit && (
                <button className="item-card__action" onClick={() => onEdit(item)}>
                  <PencilSimple weight="bold" size={16} />
                </button>
              )}
              <button
                className="item-card__action item-card__action--danger"
                onClick={() => deleteItem(collectionId, item.id)}
              >
                <Trash weight="bold" size={16} />
              </button>
            </motion.div>
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
}
