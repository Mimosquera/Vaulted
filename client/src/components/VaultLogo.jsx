import { motion } from 'framer-motion';

export default function VaultLogo({ size = 32, className = '' }) {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vaultGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#a855f7', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="vaultGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer vault frame */}
      <rect
        x="6"
        y="8"
        width="52"
        height="48"
        rx="4"
        fill="none"
        stroke="url(#vaultGradient)"
        strokeWidth="1.5"
      />

      {/* Door bolts - top */}
      <circle cx="14" cy="14" r="2" fill="url(#vaultGradient)" />
      <circle cx="50" cy="14" r="2" fill="url(#vaultGradient)" />

      {/* Door bolts - bottom */}
      <circle cx="14" cy="50" r="2" fill="url(#vaultGradient)" />
      <circle cx="50" cy="50" r="2" fill="url(#vaultGradient)" />

      {/* Central dial background circle */}
      <circle
        cx="32"
        cy="32"
        r="16"
        fill="none"
        stroke="url(#vaultGradient)"
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Dial ring */}
      <circle
        cx="32"
        cy="32"
        r="14"
        fill="none"
        stroke="url(#vaultGradient)"
        strokeWidth="1.5"
        filter="url(#vaultGlow)"
      />

      {/* Center lock mechanism */}
      <circle cx="32" cy="32" r="8" fill="none" stroke="url(#vaultGradient)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="5" fill="url(#vaultGradient)" opacity="0.3" />

      {/* Dial markers */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 32 + Math.cos(rad) * 13;
        const y1 = 32 + Math.sin(rad) * 13;
        const x2 = 32 + Math.cos(rad) * 15;
        const y2 = 32 + Math.sin(rad) * 15;
        return (
          <line
            key={angle}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="url(#vaultGradient)"
            strokeWidth="1.2"
            opacity="0.7"
          />
        );
      })}

      {/* Handle */}
      <path
        d="M 32 18 Q 45 18 45 32 Q 45 46 32 46"
        fill="none"
        stroke="url(#vaultGradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Inner security stripes */}
      <line x1="12" y1="24" x2="52" y2="24" stroke="url(#vaultGradient)" strokeWidth="0.5" opacity="0.3" />
      <line x1="12" y1="40" x2="52" y2="40" stroke="url(#vaultGradient)" strokeWidth="0.5" opacity="0.3" />
    </motion.svg>
  );
}
