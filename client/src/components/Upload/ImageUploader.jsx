import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CloudArrowUpIcon as CloudArrowUp } from '@phosphor-icons/react/CloudArrowUp';
import SafeImage from '../UI/SafeImage';
import './ImageUploader.scss';

export default function ImageUploader({ onFileSelect, currentPreview = null, isUploading = false, uploadProgress = 0 }) {
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
    maxSize: 25 * 1024 * 1024,
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
              <SafeImage
                src={preview}
                alt="Preview"
                aspectRatio="4 / 3"
                wrapperClassName="image-uploader__preview-media"
                imageClassName="image-uploader__preview-img"
                loading="eager"
                widthHint={1000}
              />
              {isUploading && (
                <div className="image-uploader__overlay">
                  <div className="image-uploader__progress">
                    <div
                      className="image-uploader__progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="image-uploader__uploading-text">{uploadProgress}%</span>
                </div>
              )}
              {!isUploading && (
                <button className="image-uploader__remove" onClick={removeImage}>
                  <X strokeWidth={2} size={14} />
                </button>
              )}
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
              <span className="image-uploader__hint">PNG, JPG, WebP, GIF up to 25MB</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
