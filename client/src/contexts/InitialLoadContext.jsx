import { useState } from 'react';
import { InitialLoadContext } from './InitialLoadContextValue';

export function InitialLoadProvider({ children }) {
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // flip this off after the first render so nav transitions don't re-run entrance animations
  const markLoadComplete = () => {
    setIsInitialLoad(false);
  };

  return (
    <InitialLoadContext.Provider value={{ isInitialLoad, markLoadComplete }}>
      {children}
    </InitialLoadContext.Provider>
  );
}
