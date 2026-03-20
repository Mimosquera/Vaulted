import { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CloudArrowUpIcon as CloudArrowUp } from '@phosphor-icons/react/CloudArrowUp';
import { CropIcon as CropIcon } from '@phosphor-icons/react/Crop';
import SafeImage from '../UI/SafeImage';
import ImageCropper from './ImageCropper';
import './ImageUploader.scss';

const isBlobUrl = (url) => typeof url === 'string' && url.startsWith('blob:');

const inferMimeFromUrl = (url) => {
  if (!url || typeof url !== 'string') return 'image/jpeg';
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
};

export default function ImageUploader({ onFileSelect, currentPreview = null, isUploading = false, uploadProgress = 0 }) {
  const [preview, setPreview] = useState(undefined);
  const [cropOpen, setCropOpen] = useState(false);
  const [originalSrc, setOriginalSrc] = useState(undefined);    // undefined means follow currentPreview
  const [originalMime, setOriginalMime] = useState(undefined);
  const revokeOriginalRef = useRef(null);  // tracks URL to revoke; NOT read in JSX
  const revokeCroppedRef = useRef(null);   // tracks cropped URL to revoke; NOT read in JSX

  const resolvedPreview = preview === undefined ? currentPreview : preview;
  const resolvedOriginalSrc = originalSrc === undefined ? currentPreview : originalSrc;
  const resolvedOriginalMime = originalMime ?? inferMimeFromUrl(currentPreview);

  // Revoke any lingering crop source URL when component unmounts
  useEffect(() => {
    return () => {
      if (revokeOriginalRef.current) URL.revokeObjectURL(revokeOriginalRef.current);
      if (revokeCroppedRef.current) URL.revokeObjectURL(revokeCroppedRef.current);
    };
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Clean up previous URLs
    if (isBlobUrl(revokeOriginalRef.current)) URL.revokeObjectURL(revokeOriginalRef.current);
    if (isBlobUrl(revokeCroppedRef.current)) URL.revokeObjectURL(revokeCroppedRef.current);
    revokeCroppedRef.current = null;

    const url = URL.createObjectURL(file);
    revokeOriginalRef.current = url;

    setOriginalSrc(url);
    setOriginalMime(file.type || 'image/jpeg');
    setPreview(url);
    onFileSelect(file);
    setCropOpen(false);
  }, [onFileSelect]); // originalSrc/originalMime set via setState, no dep needed

  const handleCropDone = useCallback((blob) => {
    setCropOpen(false);
    if (!blob) return;

    if (isBlobUrl(revokeCroppedRef.current)) URL.revokeObjectURL(revokeCroppedRef.current);

    const mime = originalMime ?? inferMimeFromUrl(currentPreview);
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    const croppedFile = new File([blob], `cropped.${ext}`, { type: mime });
    const previewUrl = URL.createObjectURL(blob);
    revokeCroppedRef.current = previewUrl;

    setPreview(previewUrl);
    onFileSelect(croppedFile);
  }, [onFileSelect, originalMime, currentPreview]);

  const handleCropCancel = useCallback(() => {
    setCropOpen(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1,
    multiple: false,
    maxSize: 25 * 1024 * 1024,
  });

  const removeImage = (e) => {
    e.stopPropagation();
    setCropOpen(false);
    if (isBlobUrl(revokeOriginalRef.current)) URL.revokeObjectURL(revokeOriginalRef.current);
    if (isBlobUrl(revokeCroppedRef.current)) URL.revokeObjectURL(revokeCroppedRef.current);
    revokeOriginalRef.current = null;
    revokeCroppedRef.current = null;
    setOriginalSrc(null);
    setOriginalMime(undefined);
    setPreview(null);
    onFileSelect(null);
  };

  const openCrop = useCallback((e) => {
    e.stopPropagation();
    setCropOpen(true);
  }, []);

  return (
    <div className="image-uploader">
      {/* ── Cropper overlay (shown after file selected, before confirmed) ── */}
      <AnimatePresence>
        {cropOpen && resolvedOriginalSrc && (
          <ImageCropper
            imageSrc={resolvedOriginalSrc}
            mimeType={resolvedOriginalMime}
            onCropDone={handleCropDone}
            onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>

      {/* ── Dropzone / preview (hidden while cropper is open) ── */}
      {!cropOpen && (
        <div
          {...getRootProps()}
          className={`image-uploader__dropzone ${isDragActive ? 'image-uploader__dropzone--active' : ''} ${resolvedPreview ? 'image-uploader__dropzone--has-image' : ''}`}
        >
          <input {...getInputProps()} />

          <AnimatePresence mode="wait">
            {resolvedPreview ? (
              <motion.div
                key="preview"
                className="image-uploader__preview"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <SafeImage
                  src={resolvedPreview}
                  alt="Preview"
                  aspectRatio="4 / 3"
                  wrapperClassName="image-uploader__preview-media"
                  imageClassName="image-uploader__preview-img"
                  loading="eager"
                  widthHint={1000}
                  metricContext="uploader-preview"
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
                  <div className="image-uploader__preview-actions">
                    <button
                      type="button"
                      className="image-uploader__action-btn"
                      title="Crop image"
                      aria-label="Crop image"
                      onClick={openCrop}
                    >
                      <CropIcon weight="bold" size={14} />
                    </button>
                    <button
                      type="button"
                      className="image-uploader__remove"
                      onClick={removeImage}
                      title="Remove image"
                      aria-label="Remove image"
                    >
                      <X strokeWidth={2} size={14} />
                    </button>
                  </div>
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
      )}
    </div>
  );
}
