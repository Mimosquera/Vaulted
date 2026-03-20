import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { PaletteIcon as Palette } from '@phosphor-icons/react/Palette';
import { EyeIcon as Eye } from '@phosphor-icons/react/Eye';
import { EyeSlashIcon as EyeSlash } from '@phosphor-icons/react/EyeSlash';
import { UsersThreeIcon as UsersThree } from '@phosphor-icons/react/UsersThree';
import { CATEGORIES } from '../../store/useStore';
import { COLLECTION_COLORS } from '../../constants/colors';
import ImageUploader from '../Upload/ImageUploader';
import useStore from '../../store/useStore';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import './Modal.scss';

export default function EditCollectionModal({ isOpen, onClose, onUpdate, collection }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [coverColor, setCoverColor] = useState('#7c3aed');
  const [visibility, setVisibility] = useState('private');
  const [coverImage, setCoverImage] = useState(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const getImageUrl = useStore((s) => s.getImageUrl);

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setCategory(collection.category);
      setDescription(collection.description || '');
      setCoverColor(collection.coverColor);
      setVisibility(collection.visibility || (collection.isPublic ? 'public' : 'private'));

      if (collection.coverImageUrl) {
        getImageUrl(collection.coverImageUrl).then((url) => {
          setCurrentCoverUrl(url);
        });
      } else {
        setCurrentCoverUrl(null);
      }
    }
  }, [collection, isOpen, getImageUrl]);

  useModalScrollLock(isOpen);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !category || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await onUpdate(
        { name: name.trim(), category, description: description.trim(), coverColor, coverImage, visibility },
        (progress) => setUploadProgress(progress)
      );
      onClose();
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (!collection) return null;

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
              <h2>Edit Collection</h2>
              <button className="modal__close" onClick={onClose}>
                <X strokeWidth={2} size={14} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal__body">
              <ImageUploader
                onFileSelect={setCoverImage}
                currentPreview={currentCoverUrl}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />

              <div className="modal__field">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="e.g. Holographic Pokémon Cards"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                  autoFocus
                />
              </div>

              <div className="modal__field">
                <label>Category</label>
                <div className="modal__categories">
                  {CATEGORIES.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      className={`modal__category-chip ${category === cat.id ? 'modal__category-chip--active' : ''}`}
                      onClick={() => setCategory(cat.id)}
                    >
                      <span>{cat.Icon && <cat.Icon weight="duotone" size={16} />}</span> {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal__field">
                <label>Description <span className="modal__optional">(optional)</span></label>
                <textarea
                  placeholder="What makes this collection special?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className="modal__field">
                <label>Visibility</label>
                <div className="modal__visibility-options">
                  <button type="button" className={`modal__visibility-option ${visibility === 'private' ? 'modal__visibility-option--active' : ''}`} onClick={() => setVisibility('private')}>
                    <EyeSlash size={16} /> Private
                  </button>
                  <button type="button" className={`modal__visibility-option ${visibility === 'friends_only' ? 'modal__visibility-option--active' : ''}`} onClick={() => setVisibility('friends_only')}>
                    <UsersThree size={16} /> Friends
                  </button>
                  <button type="button" className={`modal__visibility-option ${visibility === 'public' ? 'modal__visibility-option--active' : ''}`} onClick={() => setVisibility('public')}>
                    <Eye size={16} /> Public
                  </button>
                </div>
              </div>

              <div className="modal__field">
                <label><Palette weight="duotone" size={16} /> Cover Color</label>
                <div className="modal__colors">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={`modal__color ${coverColor === color ? 'modal__color--active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setCoverColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="modal__actions">
                <button type="button" className="btn btn--secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={!name.trim() || !category || isUploading}
                >
                  <Check strokeWidth={2} size={14} />
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
