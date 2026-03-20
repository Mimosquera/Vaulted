import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initPerformanceTracking } from './utils/performanceMetrics';

initPerformanceTracking();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
