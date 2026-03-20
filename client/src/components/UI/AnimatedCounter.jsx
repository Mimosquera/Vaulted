import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

export default function AnimatedCounter({ value, duration = 1.5 }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setInView(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, value, {
      duration,
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.floor(v).toLocaleString();
      },
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return <span ref={ref}>0</span>;
}
