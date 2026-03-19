import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Squash as Hamburger } from 'hamburger-react';
import { HouseIcon as House } from '@phosphor-icons/react/House';
import { VaultIcon as Vault } from '@phosphor-icons/react/Vault';
import { CompassIcon as Compass } from '@phosphor-icons/react/Compass';
import { UserCircleIcon as UserCircle } from '@phosphor-icons/react/UserCircle';
import { DiamondIcon as Diamond } from '@phosphor-icons/react/Diamond';
import { SignInIcon as SignIn } from '@phosphor-icons/react/SignIn';
import { SignOutIcon as SignOut } from '@phosphor-icons/react/SignOut';
import useStore from '../../store/useStore';
import './Navbar.scss';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const username = useStore((s) => s.username);
  const logout = useStore((s) => s.logout);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (isOpen) setIsOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = isAuthenticated
    ? [
        { to: '/', label: 'Home', icon: <House weight="duotone" /> },
        { to: '/dashboard', label: 'My Vault', icon: <Vault weight="duotone" /> },
        { to: '/explore', label: 'Explore', icon: <Compass weight="duotone" /> },
        { to: '/profile', label: 'Profile', icon: <UserCircle weight="duotone" /> },
      ]
    : [
        { to: '/', label: 'Home', icon: <House weight="duotone" /> },
        { to: '/explore', label: 'Explore', icon: <Compass weight="duotone" /> },
      ];

  return (
    <motion.nav
      className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      <div className="navbar__inner">
        <Link to="/" className="navbar__logo">
          <motion.div
            className="navbar__logo-icon"
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Diamond weight="fill" size={28} />
          </motion.div>
          <span className="navbar__logo-text">
            Collecto
          </span>
        </Link>

        <div className="navbar__links">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar__link ${location.pathname === link.to ? 'navbar__link--active' : ''}`}
            >
              {link.icon}
              <span>{link.label}</span>
              {location.pathname === link.to && (
                <motion.div
                  className="navbar__link-indicator"
                  layoutId="nav-indicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          ))}

          {isAuthenticated ? (
            <div className="navbar__auth">
              <div className="navbar__user">
                <span className="navbar__user-name">{username}</span>
              </div>
              <button className="navbar__logout" onClick={handleLogout} title="Sign out">
                <SignOut weight="bold" size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="navbar__login-btn">
              <SignIn weight="bold" size={16} />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        <div className="navbar__hamburger">
          <Hamburger
            toggled={isOpen}
            toggle={setIsOpen}
            size={22}
            color="#c8c8d0"
            rounded
            duration={0.4}
          />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="navbar__mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={link.to}
                  className={`navbar__mobile-link ${location.pathname === link.to ? 'navbar__mobile-link--active' : ''}`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </Link>
              </motion.div>
            ))}

            {isAuthenticated ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.08 }}
              >
                <button className="navbar__mobile-link" onClick={handleLogout}>
                  <SignOut weight="bold" size={20} />
                  <span>Sign Out</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: navLinks.length * 0.08 }}
              >
                <Link to="/login" className="navbar__mobile-link">
                  <SignIn weight="bold" size={20} />
                  <span>Sign In</span>
                </Link>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
