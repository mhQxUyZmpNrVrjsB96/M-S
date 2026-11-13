import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gestione resiliente per disconnessioni momentanee WebSocket durante riavvii o proxy handshakes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason ? String(event.reason.message || event.reason) : '';
    if (reasonStr.includes('WebSocket') || reasonStr.includes('closed without opened')) {
      event.preventDefault();
      console.warn('[Vite HMR] Connessione WebSocket in fase di negoziazione o riconnessione:', reasonStr);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
