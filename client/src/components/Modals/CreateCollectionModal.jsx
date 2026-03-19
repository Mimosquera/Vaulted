import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon as X } from '@phosphor-icons/react/X';
import { PlusIcon as Plus } from '@phosphor-icons/react/Plus';
import { PaletteIcon as Palette } from '@phosphor-icons/react/Palette';
import { CATEGORIES } from '../../store/useStore';
import ImageUploader from '../Upload/ImageUploader';
import './Modal.scss';

const COLORS = [
  '#7c3aed', '#dc2626', '#2563eb', '#4c1d95', '#00c4cc', '#9333ea',
  '#16a34a', '#d4a017', '#c2410c', '#4f46e5', '#ec4899', '#06b6d4',
  '#8b5cf6', '#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'
];

export default function CreateCollectionModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [coverColor, setCoverColor] = useState('#7c3aed');
  const [coverImage, setCoverImage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !category) return;
    onCreate({ name: name.trim(), category, description: description.trim(), coverColor, coverImage });
    setName('');
    setCategory('');
    setDescription('');
    setCoverColor('#7c3aed');
    setCoverImage(null);
    onClose();
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
            className="modal"
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__header">
              <h2>New Collection</h2>
              <button className="modal__close" onClick={onClose}>
                <X weight="bold" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal__body">
              <ImageUploader onFileSelect={setCoverImage} />

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
                <label><Palette weight="duotone" size={16} /> Cover Color</label>
                <div className="modal__colors">
                  {COLORS.map((color) => (
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
                <button className="btn btn--secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={!name.trim() || !category}
                >
                  <Plus weight="bold" />
                  Create Collection
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
