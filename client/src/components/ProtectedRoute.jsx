import { Navigate } from 'react-router-dom';
import useStore from '../store/useStore';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const loaded = useStore((s) => s.loaded);

  if (!loaded) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
