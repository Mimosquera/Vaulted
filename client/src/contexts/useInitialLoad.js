import { useContext } from 'react';
import { InitialLoadContext } from './InitialLoadContextValue';

export function useInitialLoad() {
  const context = useContext(InitialLoadContext);
  if (!context) {
    throw new Error('useInitialLoad must be used within InitialLoadProvider');
  }
  return context;
}
