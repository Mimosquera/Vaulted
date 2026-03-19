import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { CloudArrowUpIcon as CloudArrowUp } from '@phosphor-icons/react/CloudArrowUp';
import { XIcon as X } from '@phosphor-icons/react/X';
import { ImageIcon } from '@phosphor-icons/react/Image';
import './ImageUploader.scss';

export default function ImageUploader({ onFileSelect, currentPreview = null }) {
  const [preview, setPreview] = useState(currentPreview);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect(file);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1,
    multiple: false,
    maxSize: 50 * 1024 * 1024,
  });

  const removeImage = (e) => {
    e.stopPropagation();
    if (preview && !currentPreview) URL.revokeObjectURL(preview);
    setPreview(null);
    onFileSelect(null);
  };

  return (
    <div className="image-uploader">
      <div
        {...getRootProps()}
        className={`image-uploader__dropzone ${isDragActive ? 'image-uploader__dropzone--active' : ''} ${preview ? 'image-uploader__dropzone--has-image' : ''}`}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              className="image-uploader__preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <img src={preview} alt="Preview" />
              <button className="image-uploader__remove" onClick={removeImage}>
                <X weight="bold" size={16} />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="image-uploader__empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                animate={isDragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <CloudArrowUp weight="duotone" size={40} />
              </motion.div>
              <p className="image-uploader__text">
                {isDragActive ? 'Drop it here!' : 'Drag & drop or click to upload'}
              </p>
              <span className="image-uploader__hint">PNG, JPG, WebP up to 50MB</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
