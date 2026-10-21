import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSyncManager } from './services/syncService';

// C-01 & F-01: Inicializar el gestor de sincronización offline-first
initSyncManager();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
