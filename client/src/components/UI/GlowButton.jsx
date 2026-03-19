import { motion } from 'framer-motion';
import './GlowButton.scss';

export default function GlowButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  type = 'button',
  className = '',
}) {
  return (
    <motion.button
      className={`glow-btn glow-btn--${variant} glow-btn--${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <span className="glow-btn__bg" />
      <span className="glow-btn__content">
        {icon && <span className="glow-btn__icon">{icon}</span>}
        {children}
      </span>
    </motion.button>
  );
}
