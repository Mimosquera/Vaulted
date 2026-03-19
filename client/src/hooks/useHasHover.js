import { useState, useEffect } from 'react';

export default function useHasHover() {
  const [hasHover, setHasHover] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(hover: hover)').matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover)');
    const handler = (e) => setHasHover(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return hasHover;
}
