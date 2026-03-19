import { useMemo } from 'react';
import './FloatingParticles.scss';

const NEON_COLORS = [
  '#7c3aed', '#9333ea', '#4c1d95', // purples
  '#dc2626', '#b91c1c',             // reds
  '#2563eb', '#1d4ed8',             // blues
  '#3b0764',                        // deep violet
  '#00c4cc',                        // neon cyan
];

function createParticle() {
  const color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
  const size = Math.random() * 4 + 2;
  const x = Math.random() * 100;
  const duration = Math.random() * 25 + 18;
  const delay = Math.random() * duration;
  const drift = (Math.random() - 0.5) * 120;
  const glow = size * (2 + Math.random() * 3);
  return { color, size, x, duration, delay, drift, glow };
}

export default function FloatingParticles({ count = 40 }) {
  const particles = useMemo(() => Array.from({ length: count }, createParticle), [count]);

  return (
    <div className="floating-particles" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="floating-particles__dot"
          style={{
            '--x': `${p.x}%`,
            '--drift': `${p.drift}px`,
            '--glow-color': p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.glow}px ${p.color}, 0 0 ${p.glow * 2}px ${p.color}40`,
            animationDuration: `${p.duration}s`,
            animationDelay: `-${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
