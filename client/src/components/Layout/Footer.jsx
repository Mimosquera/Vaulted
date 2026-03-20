import { motion } from 'framer-motion';
import VaultLogo from '../VaultLogo';
import './Footer.scss';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__glow" />
      <div className="footer__inner">
        <div className="footer__brand">
          <VaultLogo size={20} className="footer__icon" />
          <span className="footer__name">Vaulted</span>
        </div>

        <p className="footer__tagline">
          Curate your collection.
        </p>

        <div className="footer__bottom">
          <span className="footer__copy">
            &copy; {new Date().getFullYear()} Vaulted
          </span>
        </div>
      </div>
    </footer>
  );
}
