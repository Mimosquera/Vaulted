import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import SafeImage from '../UI/SafeImage';
import './ItemLightbox.scss';

export default function ItemLightbox({ item, imageUrl, isOpen, onClose }) {
  useModalScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          className="item-lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <button className="item-lightbox__close" onClick={onClose}>
            <X strokeWidth={2} size={14} />
          </button>

          <motion.div
            className="item-lightbox__content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <SafeImage
              src={imageUrl}
              alt={item.name}
              objectFit="contain"
              aspectRatio="4 / 3"
              loading="eager"
              fetchPriority="high"
              widthHint={1600}
              wrapperClassName="item-lightbox__safe-image"
              imageClassName="item-lightbox__image"
            />
            <div className="item-lightbox__info">
              <h3 className="item-lightbox__name">{item.name}</h3>
              {item.note && <p className="item-lightbox__note">{item.note}</p>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
