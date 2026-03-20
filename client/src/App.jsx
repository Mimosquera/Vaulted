import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import useStore from './store/useStore';
import { InitialLoadProvider } from './contexts/InitialLoadContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import FloatingParticles from './components/UI/FloatingParticles';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/global.scss';

const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CollectionView = lazy(() => import('./pages/CollectionView'));
const PublicCollectionView = lazy(() => import('./pages/PublicCollectionView'));
const Explore = lazy(() => import('./pages/Explore'));
const Profile = lazy(() => import('./pages/Profile'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const DevPerfPanel = import.meta.env.DEV ? lazy(() => import('./components/UI/DevPerfPanel')) : null;

// Renders only after Suspense resolves (lazy component loaded).
// Reveals #root so navbar/footer snap visible while the route animates in.
function ReadyGate({ children }) {
  useEffect(() => {
    document.getElementById('root').classList.add('ready');
  }, []);
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <Suspense fallback={null}>
          <ReadyGate>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/collection/:id" element={<ProtectedRoute><CollectionView /></ProtectedRoute>} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/explore/:id" element={<PublicCollectionView />} />
              <Route path="/u/:userId" element={<PublicProfile />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            </Routes>
          </ReadyGate>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
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
        {DevPerfPanel && (
          <Suspense fallback={null}>
            <DevPerfPanel />
          </Suspense>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <InitialLoadProvider>
      <AppContent />
    </InitialLoadProvider>
  );
}

