import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon as X } from '@phosphor-icons/react/X';
import { CopyIcon as Copy } from '@phosphor-icons/react/Copy';
import { CheckIcon as Check } from '@phosphor-icons/react/Check';
import { ShareNetworkIcon as ShareNetwork } from '@phosphor-icons/react/ShareNetwork';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { EyeSlashIcon as EyeSlash } from '@phosphor-icons/react/EyeSlash';
import useStore from '../../store/useStore';
import './Modal.scss';

export default function ShareModal({ isOpen, onClose, collection }) {
  const [copied, setCopied] = useState(false);
  const togglePublic = useStore((s) => s.togglePublic);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  if (!collection) return null;

  const shareUrl = `${window.location.origin}/collection/${collection.id}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal modal--sm"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h2><ShareNetwork weight="duotone" size={22} /> Share Collection</h2>
              <button className="modal__close" onClick={onClose}>
                <X weight="bold" size={20} />
              </button>
            </div>

            <div className="modal__body">
              <div className="modal__share-status">
                <span className={`modal__visibility ${collection.isPublic ? 'modal__visibility--public' : ''}`}>
                  {collection.isPublic ? (
                    <><Eye weight="bold" size={16} /> Public (visible on Explore)</>
                  ) : (
                    <><EyeSlash weight="bold" size={16} /> Private (only you)</>
                  )}
                </span>
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={() => togglePublic(collection.id)}
                >
                  {collection.isPublic ? 'Make Private' : 'Make Public'}
                </button>
              </div>

              <div className="modal__field">
                <label>Share Link</label>
                <div className="modal__copy-row">
                  <input type="text" value={shareUrl} readOnly />
                  <button
                    className={`btn btn--sm ${copied ? 'btn--primary' : 'btn--secondary'}`}
                    onClick={handleCopy}
                  >
                    {copied ? <Check weight="bold" /> : <Copy weight="bold" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
