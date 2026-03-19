import { createContext, useState, useContext } from 'react';

const InitialLoadContext = createContext();

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

export function useInitialLoad() {
  const context = useContext(InitialLoadContext);
  if (!context) {
    throw new Error('useInitialLoad must be used within InitialLoadProvider');
  }
  return context;
}
