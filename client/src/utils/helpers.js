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
