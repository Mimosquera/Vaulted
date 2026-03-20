import { StackIcon as Stack } from '@phosphor-icons/react/Stack';
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

export const CATEGORIES = [
  { id: 'trading-cards', label: 'Trading Cards', Icon: Stack },
  { id: 'music', label: 'Music', Icon: MusicNotes },
  { id: 'figures', label: 'Figures', Icon: PersonArmsSpread },
  { id: 'clothes', label: 'Clothes', Icon: TShirt },
  { id: 'pins', label: 'Pins', Icon: PushPin },
  { id: 'sneakers', label: 'Sneakers', Icon: Sneaker },
  { id: 'manga', label: 'Manga', Icon: BookOpen },
  { id: 'video-games', label: 'Video Games', Icon: GameController },
  { id: 'coins', label: 'Coins', Icon: CurrencyCircleDollar },
  { id: 'art', label: 'Art', Icon: PaintBrush },
  { id: 'anime', label: 'Anime', Icon: Scroll },
  { id: 'custom', label: 'Custom', Icon: Sparkle },
];

const ICON_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.Icon]));
const LABEL_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

export function getCategoryIcon(categoryId) {
  return ICON_MAP[categoryId] || Sparkle;
}

export function getCategoryLabel(categoryId) {
  return LABEL_MAP[categoryId] || 'Collection';
}
