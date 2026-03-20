import { COLLECTION_COLORS } from '../constants/colors';

export { getCategoryIcon as getCategoryIconComponent, getCategoryLabel } from '../constants/categories';

export function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  const intervals = [
    { label: 'y', seconds: 31536000 },
    { label: 'mo', seconds: 2592000 },
    { label: 'd', seconds: 86400 },
    { label: 'h', seconds: 3600 },
    { label: 'm', seconds: 60 },
  ];
  for (const { label, seconds: s } of intervals) {
    const count = Math.floor(seconds / s);
    if (count >= 1) return `${count}${label} ago`;
  }
  return 'just now';
}

export function getRandomColor() {
  return COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)];
}

export function isCloudUrl(url) {
  if (!url) return true;
  return url.startsWith('http://') || url.startsWith('https://');
}

function isCloudinaryUrl(url) {
  return typeof url === 'string' && /res\.cloudinary\.com/i.test(url) && /\/upload\//i.test(url);
}

export function optimizeImageUrl(url, options = {}) {
  if (!url || !isCloudinaryUrl(url)) return url;

  const {
    width = null,
    fit = 'cover',
    quality = 'auto',
    format = 'auto',
  } = options;

  const roundedWidth = Number.isFinite(width) ? Math.max(80, Math.round(width)) : null;
  const crop = fit === 'contain' ? 'c_limit' : 'c_fill,g_auto';
  const transforms = [
    `f_${format}`,
    `q_${quality}`,
    'dpr_auto',
    crop,
  ];

  if (roundedWidth) {
    transforms.push(`w_${roundedWidth}`);
  }

  const transformString = transforms.join(',');
  return url.replace('/upload/', `/upload/${transformString}/`);
}

export function getReturnPath(locationOrPath, fallback = '/explore') {
  if (!locationOrPath) return fallback;
  if (typeof locationOrPath === 'string') return locationOrPath;

  const pathname = locationOrPath.pathname || fallback;
  const search = locationOrPath.search || '';
  const hash = locationOrPath.hash || '';
  return `${pathname}${search}${hash}`;
}

export function getPublicProfileLinkState(locationOrPath, fallback = '/explore') {
  return { from: getReturnPath(locationOrPath, fallback) };
}
