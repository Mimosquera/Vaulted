import { useSpring, animated } from '@react-spring/web';
import { useEffect, useState } from 'react';

export default function AnimatedCounter({ value, duration = 1500 }) {
  const [inView, setInView] = useState(false);

  const { number } = useSpring({
    from: { number: 0 },
    number: inView ? value : 0,
    config: { duration },
  });

  useEffect(() => {
    const timer = setTimeout(() => setInView(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <animated.span>
      {number.to((n) => Math.floor(n).toLocaleString())}
    </animated.span>
  );
}
