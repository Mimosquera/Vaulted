import { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop, convertToPixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion } from 'framer-motion';
import { CheckIcon as Check } from '@phosphor-icons/react/Check';
import { X } from 'lucide-react';
import './ImageCropper.scss';

// canvas helper

async function getCroppedBlob(image, crop, mimeType = 'image/jpeg', cropShape = 'rect') {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = Math.floor(crop.width * scaleX);
  canvas.height = Math.floor(crop.height * scaleY);

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  if (cropShape === 'circle') {
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
}

// constants

const ASPECT_RATIOS = [
  { label: 'Free', value: undefined },
  { label: '1 : 1', value: 1 },
  { label: '4 : 3', value: 4 / 3 },
  { label: '16 : 9', value: 16 / 9 },
];

function makeCenteredCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight,
  );
}


export default function ImageCropper({ imageSrc, mimeType = 'image/jpeg', onCropDone, onCancel, cropShape = 'rect' }) {
  const imgRef = useRef(null);
  const [crop, setCrop] = useState(undefined);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [aspect, setAspect] = useState(cropShape === 'circle' ? 1 : undefined);
  const [applying, setApplying] = useState(false);

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    // Full-image free selection so Apply works immediately
    const initial = cropShape === 'circle'
      ? makeCenteredCrop(width, height, 1)
      : { unit: '%', x: 0, y: 0, width: 100, height: 100 };
    setCrop(initial);
    setCompletedCrop(convertToPixelCrop(initial, width, height));
  }, [cropShape]);

  const handleAspectChange = (value) => {
    setAspect(value);
    if (value !== undefined && imgRef.current) {
      const { width, height } = imgRef.current;
      const next = makeCenteredCrop(width, height, value);
      setCrop(next);
      setCompletedCrop(convertToPixelCrop(next, width, height));
    }
  };

  const handleApply = async () => {
    if (!completedCrop || completedCrop.width === 0 || applying) return;
    if (!imgRef.current) return;
    setApplying(true);
    try {
      const outputMimeType = cropShape === 'circle' ? 'image/png' : mimeType;
      const blob = await getCroppedBlob(imgRef.current, completedCrop, outputMimeType, cropShape);
      onCropDone(blob);
    } catch {
      onCropDone(null);
    } finally {
      setApplying(false);
    }
  };

  return (
    <motion.div
      className="image-cropper"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
    >
      {/* Header row */}
      <div className="image-cropper__topbar">
        <span className="image-cropper__title">Crop image</span>
        {cropShape !== 'circle' && (
          <div className="image-cropper__aspect-pills">
            {ASPECT_RATIOS.map((r) => (
              <button
                key={r.label}
                type="button"
                className={`image-cropper__aspect-pill${aspect === r.value ? ' image-cropper__aspect-pill--active' : ''}`}
                onClick={() => handleAspectChange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Crop canvas area */}
      <div className="image-cropper__canvas">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
          circularCrop={cropShape === 'circle'}
          minWidth={20}
          minHeight={20}
          keepSelection
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            onLoad={onImageLoad}
            className="image-cropper__img"
          />
        </ReactCrop>
      </div>

      {/* Actions */}
      <div className="image-cropper__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          <X strokeWidth={2} size={14} /> Cancel
        </button>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={handleApply}
          disabled={applying || !completedCrop || completedCrop.width === 0}
        >
          <Check weight="bold" size={14} />
          {applying ? 'Applying…' : 'Apply Crop'}
        </button>
      </div>
    </motion.div>
  );
}
