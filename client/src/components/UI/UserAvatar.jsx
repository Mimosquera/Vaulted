import { useMemo, useState } from 'react';
import { UserCircleIcon as UserCircle } from '@phosphor-icons/react/UserCircle';
import './UserAvatar.scss';

const DEFAULT_ICON_COLOR = '#8b5cf6';

function toRgb(hex) {
  if (typeof hex !== 'string') return null;
  const normalized = hex.trim().replace('#', '');
  if (!/^[\da-fA-F]{6}$/.test(normalized)) return null;

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampUnit(value) {
  return Math.max(0, Math.min(1, value));
}

function rgbToHsl(rgb) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
      break;
  }

  return { h: h / 6, s, l };
}

function hueToRgb(p, q, t) {
  let n = t;
  if (n < 0) n += 1;
  if (n > 1) n -= 1;
  if (n < 1 / 6) return p + (q - p) * 6 * n;
  if (n < 1 / 2) return q;
  if (n < 2 / 3) return p + (q - p) * (2 / 3 - n) * 6;
  return p;
}

function hslToRgb(hsl) {
  const h = clampUnit(hsl.h);
  const s = clampUnit(hsl.s);
  const l = clampUnit(hsl.l);

  if (s === 0) {
    const gray = clamp(l * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - (l * s);
  const p = 2 * l - q;

  return {
    r: clamp(hueToRgb(p, q, h + 1 / 3) * 255),
    g: clamp(hueToRgb(p, q, h) * 255),
    b: clamp(hueToRgb(p, q, h - 1 / 3) * 255),
  };
}

function toRgbaString(rgb, alpha) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getToneShade(hex) {
  const base = toRgb(hex) || toRgb(DEFAULT_ICON_COLOR);
  const hsl = rgbToHsl(base);
  const boostedSaturation = clampUnit(hsl.s + 0.08);

  const bgBase = hslToRgb({
    h: hsl.h,
    s: boostedSaturation,
    l: clampUnit(hsl.l + (hsl.l < 0.36 ? 0.16 : hsl.l > 0.68 ? -0.16 : 0.06)),
  });

  const ringBase = hslToRgb({
    h: hsl.h,
    s: boostedSaturation,
    l: clampUnit(hsl.l + (hsl.l < 0.5 ? 0.12 : -0.12)),
  });

  const glowBase = hslToRgb({
    h: hsl.h,
    s: clampUnit(hsl.s + 0.04),
    l: clampUnit(hsl.l + (hsl.l < 0.5 ? 0.07 : -0.07)),
  });

  const softOuter = hslToRgb({
    h: hsl.h,
    s: boostedSaturation,
    l: clampUnit(hsl.l + (hsl.l < 0.5 ? 0.2 : -0.2)),
  });

  return {
    bg: toRgbaString(bgBase, 0.28),
    ring: toRgbaString(ringBase, 0.5),
    glow: toRgbaString(glowBase, 0.38),
    // Outer glow layers: same hue family with tuned lightness/saturation (no white cast)
    complementGlow: toRgbaString(ringBase, 0.44),
    complementSoft: toRgbaString(softOuter, 0.26),
  };
}

export default function UserAvatar({
  user,
  size = 40,
  className = '',
  alt,
  decorative = false,
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const avatarImageUrl = user?.avatarImageUrl || null;
  const avatarIconColor = user?.avatarIconColor || DEFAULT_ICON_COLOR;
  const tone = getToneShade(avatarIconColor);
  const label = alt || (user?.username ? `${user.username} avatar` : 'User avatar');

  const wrapperStyle = useMemo(() => ({
    '--avatar-size': `${size}px`,
    '--avatar-icon-color': avatarIconColor,
    '--avatar-icon-bg': tone.bg,
    '--avatar-icon-ring': tone.ring,
    '--avatar-icon-glow': tone.glow,
    '--avatar-icon-complement-glow': tone.complementGlow,
    '--avatar-icon-complement-soft': tone.complementSoft,
  }), [size, avatarIconColor, tone.bg, tone.ring, tone.glow, tone.complementGlow, tone.complementSoft]);

  const shouldShowImage = Boolean(avatarImageUrl) && !imageFailed;

  return (
    <span
      className={`user-avatar ${className}`.trim()}
      style={wrapperStyle}
      aria-hidden={decorative ? 'true' : undefined}
    >
      {shouldShowImage ? (
        <img
          className="user-avatar__image"
          src={avatarImageUrl}
          alt={decorative ? '' : label}
          onError={() => setImageFailed(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <UserCircle className="user-avatar__icon" weight="duotone" aria-hidden="true" />
      )}
    </span>
  );
}
