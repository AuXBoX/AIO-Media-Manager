import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeTheme } from './utils/themeManager';
import { initializeElectronStorage } from './utils/electronStorage';

// Initialize theme before React renders to prevent flash of unstyled content
initializeTheme();

// Initialize Electron storage and then render the app
async function initializeAndRender() {
  console.log('[App] Starting initialization...');
  console.log('[App] Environment:', {
    isElectron: typeof window !== 'undefined' && window.electron !== undefined,
    userAgent: navigator.userAgent,
  });
  
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  try {
    console.log('[App] Loading persisted state from Electron storage...');
    
    // Load persisted state from Electron storage before rendering
    await initializeElectronStorage();
    
    console.log('[App] ✓ Storage initialized, now rendering React app...');
    
    // Manually trigger rehydration after storage is initialized
    // This ensures the store reads from the populated cache
    const { useAppStore } = await import('./store/appStore');
    
    console.log('[App] Triggering manual rehydration...');
    await useAppStore.persist.rehydrate();
    console.log('[App] ✓ Store rehydrated');
    
    // Log the current state after rehydration
    const state = useAppStore.getState();
    console.log('[App] Current state after rehydration:', {
      isAuthenticated: state.isAuthenticated,
      hasUser: !!state.currentUser,
      hasToken: !!state.currentToken,
      hasServer: !!state.selectedServer,
      userName: state.currentUser?.username,
    });
    
    // Now render the app with hydrated state
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('[App] ✓ React app rendered');
  } catch (error) {
    console.error('[App] ✗ Failed to initialize app:', error);
    // Render anyway to show error state
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

// Start the app
initializeAndRender();
