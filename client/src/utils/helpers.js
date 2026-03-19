import { CardsIcon as Cards } from '@phosphor-icons/react/Cards';
import { MusicNotesIcon as MusicNotes } from '@phosphor-icons/react/MusicNotes';
import { PersonArmsSpreadIcon as PersonArmsSpread } from '@phosphor-icons/react/PersonArmsSpread';
import { TShirtIcon as TShirt } from '@phosphor-icons/react/TShirt';
import { PushPinIcon as PushPin } from '@phosphor-icons/react/PushPin';
import { SneakerIcon as Sneaker } from '@phosphor-icons/react/Sneaker';
import { BookOpenIcon as BookOpen } from '@phosphor-icons/react/BookOpen';
import { GameControllerIcon as GameController } from '@phosphor-icons/react/GameController';
import { CurrencyCircleDollarIcon as CurrencyCircleDollar } from '@phosphor-icons/react/CurrencyCircleDollar';
import { ScrollIcon as Scroll } from '@phosphor-icons/react/Scroll';
import { PaintBrushIcon as PaintBrush } from '@phosphor-icons/react/PaintBrush';
import { SparkleIcon as Sparkle } from '@phosphor-icons/react/Sparkle';
import { COLLECTION_COLORS } from '../constants/colors';

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

const CATEGORY_ICONS = {
  'trading-cards': Cards,
  music: MusicNotes,
  figures: PersonArmsSpread,
  clothes: TShirt,
  pins: PushPin,
  sneakers: Sneaker,
  manga: BookOpen,
  'video-games': GameController,
  coins: CurrencyCircleDollar,
  art: PaintBrush,
  anime: Scroll,
  custom: Sparkle,
};

export function getCategoryIconComponent(categoryId) {
  return CATEGORY_ICONS[categoryId] || Sparkle;
}

export function getCategoryLabel(categoryId) {
  const map = {
    'trading-cards': 'Trading Cards',
    music: 'Music',
    figures: 'Figures',
    clothes: 'Clothes',
    pins: 'Pins',
    sneakers: 'Sneakers',
    manga: 'Manga',
    'video-games': 'Video Games',
    coins: 'Coins',
    art: 'Art',
    anime: 'Anime',
    custom: 'Custom',
  };
  return map[categoryId] || 'Collection';
}

export function getRandomColor() {
  return COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)];
}
