import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { EnvelopeSimpleIcon as EnvelopeSimple } from '@phosphor-icons/react/EnvelopeSimple';
import { LockIcon as Lock } from '@phosphor-icons/react/Lock';
import { UserCircleIcon as UserCircle } from '@phosphor-icons/react/UserCircle';
import { UserPlusIcon as UserPlus } from '@phosphor-icons/react/UserPlus';
import { DiamondIcon as Diamond } from '@phosphor-icons/react/Diamond';
import useStore from '../store/useStore';
import BlobBackground from '../components/UI/BlobBackground';
import { getUserFriendlyError } from '../constants/errorMessages';
import './Auth.scss';

export default function Register() {
  const navigate = useNavigate();
  const registerAction = useStore((s) => s.register);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const emailInvalid = email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const usernameInvalid = username.trim().length > 0 && username.trim().length < 2;
  const passwordInvalid = password.length > 0 && password.length < 8;
  const confirmInvalid = confirmPassword.length > 0 && confirmPassword !== password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (username && username.trim().length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerAction(email, password, username);
      navigate('/dashboard');
    } catch (err) {
      const userMessage = getUserFriendlyError(err);
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth page">
      <BlobBackground color1="#4c1d95" color2="#7c3aed" />
      <div className="auth__container">
        <motion.div
          className="auth__card"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <div className="auth__logo">
            <Diamond weight="fill" size={32} />
            <span>Vaulted</span>
          </div>

          <h1 className="auth__title">Create account</h1>
          <p className="auth__subtitle">Start building your collection</p>

          {error && (
            <motion.div
              className="auth__error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <form className="auth__form" onSubmit={handleSubmit}>
            <div className="auth__field">
              <label htmlFor="username">
                <UserCircle weight="duotone" size={16} />
                Username <span className="auth__optional">(optional)</span>
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="What should we call you?"
                maxLength={30}
                autoComplete="username"
              />
              <span className={`auth__hint ${usernameInvalid ? 'auth__hint--error' : ''}`}>
                {usernameInvalid ? 'Use at least 2 characters.' : '2-30 letters or numbers.'}
              </span>
            </div>

            <div className="auth__field">
              <label htmlFor="email">
                <EnvelopeSimple weight="duotone" size={16} />
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
              <span className={`auth__hint ${emailInvalid ? 'auth__hint--error' : ''}`}>
                {emailInvalid ? 'Enter a valid email address.' : 'We will never share your email.'}
              </span>
            </div>

            <div className="auth__field">
              <label htmlFor="password">
                <Lock weight="duotone" size={16} />
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                autoComplete="new-password"
                minLength={8}
              />
              <span className={`auth__hint ${passwordInvalid ? 'auth__hint--error' : ''}`}>
                {passwordInvalid ? 'Password must be at least 8 characters.' : 'Use 8+ characters for stronger security.'}
              </span>
            </div>

            <div className="auth__field">
              <label htmlFor="confirmPassword">
                <Lock weight="duotone" size={16} />
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                autoComplete="new-password"
                minLength={8}
              />
              <span className={`auth__hint ${confirmInvalid ? 'auth__hint--error' : ''}`}>
                {confirmInvalid ? 'Passwords do not match.' : 'Re-enter your password to confirm.'}
              </span>
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--lg auth__submit"
              disabled={loading}
            >
              <UserPlus weight="bold" />
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="auth__switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
