import { useState } from 'react';
import { ImageIcon } from '@phosphor-icons/react/Image';
import './SafeImage.scss';

const IMAGE_STATE = {
  EMPTY: 'empty',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
};

function SafeImageFallback({ loading }) {
  return (
    <div className="safe-image__fallback" aria-hidden={loading}>
      {loading ? (
        <span className="safe-image__shimmer" />
      ) : (
        <span className="safe-image__icon" role="img" aria-label="Image unavailable">
          <ImageIcon weight="thin" size={40} />
        </span>
      )}
    </div>
  );
}

function SafeImageWithSource({
  src,
  alt,
  onClick,
  wrapperClassName,
  imageClassName,
  aspectRatio,
  objectFit,
  loading,
}) {
  const [state, setState] = useState(IMAGE_STATE.LOADING);

  const classes = [
    'safe-image',
    `safe-image--${state}`,
    wrapperClassName,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{ '--safe-image-ratio': aspectRatio, '--safe-image-fit': objectFit }}
      onClick={onClick}
    >
      {state !== IMAGE_STATE.ERROR && (
        <img
          className={['safe-image__img', imageClassName].filter(Boolean).join(' ')}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setState(IMAGE_STATE.LOADED)}
          onError={() => setState(IMAGE_STATE.ERROR)}
        />
      )}

      {state !== IMAGE_STATE.LOADED && <SafeImageFallback loading={state === IMAGE_STATE.LOADING} />}
    </div>
  );
}

export default function SafeImage({
  src,
  alt,
  onClick,
  wrapperClassName = '',
  imageClassName = '',
  aspectRatio = '1 / 1',
  objectFit = 'cover',
  loading = 'lazy',
}) {
  if (!src) {
    return (
      <div
        className={['safe-image', `safe-image--${IMAGE_STATE.EMPTY}`, wrapperClassName].filter(Boolean).join(' ')}
        style={{ '--safe-image-ratio': aspectRatio, '--safe-image-fit': objectFit }}
        onClick={onClick}
      >
        <SafeImageFallback loading={false} />
      </div>
    );
  }

  return (
    <SafeImageWithSource
      key={src}
      src={src}
      alt={alt}
      onClick={onClick}
      wrapperClassName={wrapperClassName}
      imageClassName={imageClassName}
      aspectRatio={aspectRatio}
      objectFit={objectFit}
      loading={loading}
    />
  );
}
