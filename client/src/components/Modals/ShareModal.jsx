import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { ShareNetworkIcon as ShareNetwork } from '@phosphor-icons/react/ShareNetwork';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { EyeSlashIcon as EyeSlash } from '@phosphor-icons/react/EyeSlash';
import { UsersThreeIcon as UsersThree } from '@phosphor-icons/react/UsersThree';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import './Modal.scss';

export default function ShareModal({ isOpen, onClose, collection }) {
  const [copied, setCopied] = useState(false);
  const setCollectionVisibility = useStore((s) => s.setCollectionVisibility);

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

  const visibility = collection.visibility || (collection.isPublic ? 'public' : 'private');

  const handleSetVisibility = async (nextVisibility) => {
    await setCollectionVisibility(collection.id, nextVisibility);
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
                <span className={`modal__visibility ${visibility === 'public' ? 'modal__visibility--public' : ''}`}>
                  {visibility === 'public' && <><Eye weight="bold" size={16} /> Public (visible to everyone)</>}
                  {visibility === 'friends_only' && <><UsersThree weight="bold" size={16} /> Friends only (visible to approved friends)</>}
                  {visibility === 'private' && <><EyeSlash weight="bold" size={16} /> Private (only you)</>}
                </span>
              </div>

              <div className="modal__visibility-options">
                <button type="button" className={`modal__visibility-option ${visibility === 'private' ? 'modal__visibility-option--active' : ''}`} onClick={() => handleSetVisibility('private')}>
                  <EyeSlash size={16} /> Private
                </button>
                <button type="button" className={`modal__visibility-option ${visibility === 'friends_only' ? 'modal__visibility-option--active' : ''}`} onClick={() => handleSetVisibility('friends_only')}>
                  <UsersThree size={16} /> Friends
                </button>
                <button type="button" className={`modal__visibility-option ${visibility === 'public' ? 'modal__visibility-option--active' : ''}`} onClick={() => handleSetVisibility('public')}>
                  <Eye size={16} /> Public
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
