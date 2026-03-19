import { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon as X } from '@phosphor-icons/react/X';
import { CheckIcon as Check } from '@phosphor-icons/react/Check';
import ImageUploader from '../Upload/ImageUploader';
import './Modal.scss';

export default function EditItemModal({ isOpen, onClose, onUpdate, item }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setNote(item.note || '');
      setImageFile(null);
    }
  }, [item, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await onUpdate(
        { name: name.trim(), note: note.trim(), imageFile },
        (progress) => setUploadProgress(progress)
      );
      onClose();
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (!item) return null;

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
            className="modal"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h2>Edit Item</h2>
              <button className="modal__close" onClick={onClose}>
                <X weight="bold" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal__body">
              <ImageUploader
                onFileSelect={setImageFile}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />

              <div className="modal__field">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="e.g. Charizard VMAX"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  autoFocus
                />
              </div>

              <div className="modal__field">
                <label>Note <span className="modal__optional">(optional)</span></label>
                <textarea
                  placeholder="Condition, where you got it, etc."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={250}
                />
              </div>

              <div className="modal__actions">
                <button className="btn btn--secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={!name.trim() || isUploading}
                >
                  <Check weight="bold" />
                  {isUploading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
