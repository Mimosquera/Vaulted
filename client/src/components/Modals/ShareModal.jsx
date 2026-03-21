import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { ShareNetworkIcon as ShareNetwork } from '@phosphor-icons/react/ShareNetwork';
import { EyeSlashIcon as EyeSlash } from '@phosphor-icons/react/EyeSlash';
import toast from 'react-hot-toast';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import './Modal.scss';

export default function ShareModal({ isOpen, onClose, collection }) {
  const [copied, setCopied] = useState(false);

  useModalScrollLock(isOpen);

  if (!collection) return null;

  const visibility = collection.visibility || (collection.isPublic ? 'public' : 'private');
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
              {visibility === 'private' && (
                <p className="modal__share-note">
                  <EyeSlash weight="bold" size={14} />
                  This collection is private — only you can see it. Change visibility to let others open this link.
                </p>
              )}
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
