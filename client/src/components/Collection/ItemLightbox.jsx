import { useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon as X } from '@phosphor-icons/react/X';
import './ItemLightbox.scss';

export default function ItemLightbox({ item, imageUrl, isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', onKey);
      return () => {
        document.body.classList.remove('modal-open');
        window.removeEventListener('keydown', onKey);
      };
    }
    return () => document.body.classList.remove('modal-open');
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
            <X weight="bold" size={20} />
          </button>

          <motion.div
            className="item-lightbox__content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            {imageUrl && (
              <img
                className="item-lightbox__image"
                src={imageUrl}
                alt={item.name}
              />
            )}
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
