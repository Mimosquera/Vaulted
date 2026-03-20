import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function BlobBackground({ color1 = '#7c3aed', color2 = '#dc2626', color3 = '#2563eb' }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Disable animations on mobile
  if (isMobile) {
    return (
      <div className="blob-bg" aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', background: color1, opacity: 0.08, filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', bottom: '-15%', left: '-10%', width: '450px', height: '450px', borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%', background: color2, opacity: 0.06, filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', top: '40%', left: '50%', width: '350px', height: '350px', borderRadius: '50% 50% 50% 50%', background: color3, opacity: 0.05, filter: 'blur(90px)' }} />
      </div>
    );
  }

  return (
    <div className="blob-bg" aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
      <motion.div
        style={{
          position: 'absolute',
          top: '-20%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          background: color1,
          opacity: 0.08,
          filter: 'blur(80px)',
        }}
        animate={{
          borderRadius: [
            '30% 70% 70% 30% / 30% 30% 70% 70%',
            '70% 30% 30% 70% / 70% 70% 30% 30%',
            '30% 70% 70% 30% / 30% 30% 70% 70%',
          ],
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          bottom: '-15%',
          left: '-10%',
          width: '450px',
          height: '450px',
          borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%',
          background: color2,
          opacity: 0.06,
          filter: 'blur(80px)',
        }}
        animate={{
          borderRadius: [
            '70% 30% 30% 70% / 70% 70% 30% 30%',
            '30% 70% 70% 30% / 30% 30% 70% 70%',
            '70% 30% 30% 70% / 70% 70% 30% 30%',
          ],
          x: [0, -25, 0],
          y: [0, 15, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          width: '350px',
          height: '350px',
          borderRadius: '50% 50% 50% 50% / 50% 50% 50% 50%',
          background: color3,
          opacity: 0.05,
          filter: 'blur(90px)',
        }}
        animate={{
          borderRadius: [
            '50% 50% 50% 50%',
            '30% 70% 60% 40%',
            '50% 50% 50% 50%',
          ],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
