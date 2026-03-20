import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { ShareNetworkIcon as ShareNetwork } from '@phosphor-icons/react/ShareNetwork';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { EyeSlashIcon as EyeSlash } from '@phosphor-icons/react/EyeSlash';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import './Modal.scss';

export default function ShareModal({ isOpen, onClose, collection }) {
  const [copied, setCopied] = useState(false);
  const togglePublic = useStore((s) => s.togglePublic);

  useModalScrollLock(isOpen);

  if (!collection) return null;

  const shareUrl = `${window.location.origin}/explore/${collection.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Unable to copy to clipboard');
    }
  };

  const handleTogglePublic = async () => {
    await togglePublic(collection.id);
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
                <X strokeWidth={2} size={14} />
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
                  onClick={handleTogglePublic}
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
                    {copied ? <Check strokeWidth={2} size={16} /> : <Copy strokeWidth={2} size={16} />}
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
