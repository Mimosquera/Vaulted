import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import FloatingParticles from './components/UI/FloatingParticles';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CollectionView from './pages/CollectionView';
import PublicCollectionView from './pages/PublicCollectionView';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import './styles/global.scss';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeInOut' }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/collection/:id" element={<ProtectedRoute><CollectionView /></ProtectedRoute>} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore/:id" element={<PublicCollectionView />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const init = useStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <FloatingParticles />
        <Navbar />
        <AnimatedRoutes />
        <Footer />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0f0f1e',
              color: '#e0e0e8',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
