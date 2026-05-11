import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeTheme } from './utils/themeManager';
import { initializeElectronStorage } from './utils/electronStorage';

// Initialize theme before React renders to prevent flash of unstyled content
initializeTheme();

// Loading component to show while rehydrating
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading...</div>
        <div style={{ fontSize: '14px', opacity: 0.7 }}>Initializing application</div>
      </div>
    </div>
  );
}

// Initialize Electron storage and then render the app
async function initializeAndRender() {
  console.log('[App] Starting initialization...');
  console.log('[App] Environment:', {
    isElectron: typeof window !== 'undefined' && window.electron !== undefined,
    userAgent: navigator.userAgent,
  });
  
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('[App] ✗ Root element not found!');
    throw new Error('Root element not found');
  }

  // Show loading screen immediately
  const root = ReactDOM.createRoot(rootElement);
  root.render(<LoadingScreen />);

  try {
    console.log('[App] Loading persisted state from Electron storage...');
    
    // Load persisted state from Electron storage before rendering
    await initializeElectronStorage();
    
    console.log('[App] ✓ Storage initialized, now loading store module...');
    
    // Import store module
    const appStoreModule = await import('./store/appStore');
    console.log('[App] ✓ Store module loaded');
    
    // Manually trigger rehydration after storage is initialized
    console.log('[App] Triggering manual rehydration...');
    await appStoreModule.rehydrateStore();
    console.log('[App] ✓ Store rehydrated');
    
    // Enable writes after hydration
    const storageModule = await import('./utils/electronStorage');
    storageModule.markHydrationComplete();
    
    // Log the current state after rehydration
    const state = appStoreModule.useAppStore.getState();
    console.log('[App] Current state after rehydration:', {
      isHydrated: state.isHydrated,
      isAuthenticated: state.isAuthenticated,
      hasUser: !!state.currentUser,
      hasToken: !!state.currentToken,
      hasServer: !!state.selectedServer,
      userName: state.currentUser?.username,
    });
    
    // Now render the app with hydrated state
    console.log('[App] Rendering React app...');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('[App] ✓ React app rendered');
  } catch (error) {
    console.error('[App] ✗ Failed to initialize app:', error);
    console.error('[App] ✗ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    // Render anyway to show error state
    try {
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    } catch (renderError) {
      console.error('[App] ✗ Failed to render app:', renderError);
    }
  }
}

// Start the app
initializeAndRender();
