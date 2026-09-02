import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { I18nProvider } from './locales';
import { initializeSecurityGuard } from './services/security';
import './index.css';

// Initialize anti-inspection and DevTools protection
initializeSecurityGuard();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);
