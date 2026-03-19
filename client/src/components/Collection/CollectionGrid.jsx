import { AnimatePresence } from 'framer-motion';
import Masonry from 'react-masonry-css';
import CollectionCard from './CollectionCard';
import './CollectionGrid.scss';

const BREAKPOINT_COLS = {
  default: 3,
  1100: 2,
  700: 2,
};

export default function CollectionGrid({ collections, isVisitor = false }) {
  return (
    <AnimatePresence mode="popLayout">
      <Masonry
        breakpointCols={BREAKPOINT_COLS}
        className="collection-grid"
        columnClassName="collection-grid__column"
      >
        {collections.map((col, i) => (
          <CollectionCard key={col.id} collection={col} index={i} isVisitor={isVisitor} />
        ))}
      </Masonry>
    </AnimatePresence>
  );
}
