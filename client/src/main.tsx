import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAds } from './ads/interstitial';
import './index.css';

void initAds();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
