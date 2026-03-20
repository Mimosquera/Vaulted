import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageIcon } from '@phosphor-icons/react/Image';
import { optimizeImageUrl } from '../../utils/helpers';
import { reportImageTiming } from '../../utils/performanceMetrics';
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
  widthHint,
  fetchPriority,
  metricContext,
}) {
  const [state, setState] = useState(IMAGE_STATE.LOADING);
  const startRef = useRef(0);
  const fit = objectFit === 'contain' ? 'contain' : 'cover';

  const optimizedSrc = useMemo(() => {
    if (!src) return src;
    return optimizeImageUrl(src, { width: widthHint, fit });
  }, [src, widthHint, fit]);

  const srcSet = useMemo(() => {
    if (!src || !widthHint) return undefined;
    const oneX = optimizeImageUrl(src, { width: widthHint, fit });
    const twoX = optimizeImageUrl(src, { width: widthHint * 2, fit });
    return `${oneX} 1x, ${twoX} 2x`;
  }, [src, widthHint, fit]);

  useEffect(() => {
    startRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }, [optimizedSrc]);

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
          src={optimizedSrc}
          srcSet={srcSet}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          onLoad={() => {
            const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
            reportImageTiming({
              durationMs: end - startRef.current,
              context: metricContext,
              src: optimizedSrc,
              loading,
              widthHint,
            });
            setState(IMAGE_STATE.LOADED);
          }}
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
  widthHint,
  fetchPriority = 'auto',
  metricContext = 'image',
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
      widthHint={widthHint}
      fetchPriority={fetchPriority}
      metricContext={metricContext}
    />
  );
}
