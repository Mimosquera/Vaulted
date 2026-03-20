import { useState } from 'react';
import { InitialLoadContext } from './InitialLoadContextValue';

export function InitialLoadProvider({ children }) {
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Disable initial load flag after first render
  // This prevents entrance animations on navigation
  const markLoadComplete = () => {
    setIsInitialLoad(false);
  };

  return (
    <InitialLoadContext.Provider value={{ isInitialLoad, markLoadComplete }}>
      {children}
    </InitialLoadContext.Provider>
  );
}
