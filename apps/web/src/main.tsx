import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { applyLanguage } from './i18n';
import './pwa';
import { App } from '@/app/App';
import { readStoredLanguage } from '@/lib/language-storage';

const storedLanguage = readStoredLanguage();
if (storedLanguage) {
  applyLanguage(storedLanguage);
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
