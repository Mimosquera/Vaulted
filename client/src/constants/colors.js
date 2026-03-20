// Collection cover colors
export const COLLECTION_COLORS = [
  '#7c3aed', '#dc2626', '#2563eb', '#4c1d95', '#00c4cc', '#9333ea',
  '#16a34a', '#d4a017', '#c2410c', '#4f46e5', '#ec4899', '#06b6d4',
  '#8b5cf6', '#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'
];

// Avatar icon color options: includes app theme colors plus balanced supporting tones.
export const AVATAR_THEME_COLORS = [
  '#dc2626', // red
  '#ef4444',
  '#f43f5e', // rose
  '#be185d', // deep rose
  '#c2410c', // orange-red
  '#b45309', // burnt amber
  '#f59e0b', // amber
  '#d4a017', // gold
  '#16a34a', // green
  '#10b981', // emerald
  '#0f766e', // dark teal
  '#0891b2', // ocean
  '#00c4cc', // neon cyan
  '#06b6d4',
  '#2563eb', // blue
  '#1d4ed8', // royal blue
  '#0369a1', // deep ocean
  '#4f46e5', // indigo
  '#6366f1', // periwinkle
  '#7c3aed', // purple
  '#6d28d9',
  '#7e22ce',
  '#9333ea', // violet
  '#8b5cf6',
  '#a855f7', // bright violet
  '#4c1d95', // deep purple
  '#ec4899', // pink
  '#db2777', // deep pink
];

// Create gradients for each color (base color to lighter/rotated variation)
export const COLLECTION_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', // Purple
  'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)', // Red
  'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', // Blue
  'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)', // Dark Purple
  'linear-gradient(135deg, #00c4cc 0%, #06b6d4 100%)', // Cyan
  'linear-gradient(135deg, #9333ea 0%, #a855f7 100%)', // Magenta
  'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)', // Green
  'linear-gradient(135deg, #d4a017 0%, #f59e0b 100%)', // Gold
  'linear-gradient(135deg, #c2410c 0%, #f97316 100%)', // Orange
  'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', // Indigo
  'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)', // Pink
  'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)', // Light Cyan
  'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)', // Violet
  'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', // Light Orange
  'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)', // Light Blue
  'linear-gradient(135deg, #10b981 0%, #34d399 100%)', // Emerald
  'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)', // Amber
  'linear-gradient(135deg, #ef4444 0%, #f87171 100%)', // Bright Red
];

// Function to get gradient for a color
export function getCollectionGradient(colorHex) {
  const index = COLLECTION_COLORS.indexOf(colorHex);
  return index >= 0 ? COLLECTION_GRADIENTS[index] : COLLECTION_GRADIENTS[0];
}

// Confetti particle colors for celebrations
export const CONFETTI_COLORS = [
  '#7c3aed', '#00c4cc', '#ec4899', '#10b981', '#3b82f6'
];
