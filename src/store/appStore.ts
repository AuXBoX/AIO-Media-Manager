import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { UserInfo, PlexServer, ServerConnection } from '@/types';

/**
 * Operation status for tracking background operations
 */
export interface OperationStatus {
  id: string;
  type: string;
  total: number;
  completed: number;
  failed: number;
  status: 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  estimatedTimeRemaining?: number;
  errors: Array<{ ratingKey: string; error: string }>;
}

/**
 * Global application state
 */
export interface AppState {
  // Hydration
  isHydrated: boolean;

  // Authentication
  isAuthenticated: boolean;
  currentUser: UserInfo | null;
  currentToken: string | null;

  // Server
  selectedServer: PlexServer | null;
  serverConnection: ServerConnection | null;
  isOnline: boolean;

  // UI
  sidebarOpen: boolean;
  selectedLibrary: { key: string; title: string; type: string } | null;
  selectedItems: Set<string>;

  // Operations
  activeOperations: Map<string, OperationStatus>;

  // Actions
  markAsHydrated: () => void;
  setAuthentication: (user: UserInfo, token: string) => void;
  clearAuthentication: () => void;
  setServer: (server: PlexServer, connection: ServerConnection) => void;
  setOnlineStatus: (online: boolean) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  selectLibrary: (library: { key: string; title: string; type: string } | null) => void;
  toggleItemSelection: (ratingKey: string) => void;
  clearSelection: () => void;
  addOperation: (operation: OperationStatus) => void;
  updateOperation: (id: string, updates: Partial<OperationStatus>) => void;
  removeOperation: (id: string) => void;
}

/**
 * Create the global app store with Zustand
 */
export const useAppStore = create<AppState>()(
  devtools(
    (set) => {
      console.log('[AppStore] Creating store...');
      
      return {
        // Initial state
        isHydrated: false,
        isAuthenticated: false,
        currentUser: null,
        currentToken: null,
        selectedServer: null,
        serverConnection: null,
        isOnline: true,
        sidebarOpen: true,
        selectedLibrary: null,
        selectedItems: new Set(),
        activeOperations: new Map(),

        // Actions
        markAsHydrated: () => {
          console.log('[AppStore] Marking as hydrated');
          set({ isHydrated: true });
        },
        setAuthentication: (user, token) => {
          console.log('[AppStore] setAuthentication called');
          set({
            isAuthenticated: true,
            currentUser: user,
            currentToken: token,
          });
          // Manually save auth state after state update
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.electron?.settings) {
              const state = useAppStore.getState();
              console.log('[AppStore] Saving auth state:', {
                isAuthenticated: state.isAuthenticated,
                hasUser: !!state.currentUser,
                hasToken: !!state.currentToken,
              });
              window.electron.settings.set('aio-media-manager-storage', {
                state: {
                  isAuthenticated: state.isAuthenticated,
                  currentUser: state.currentUser,
                  currentToken: state.currentToken,
                  selectedServer: state.selectedServer,
                  serverConnection: state.serverConnection,
                  sidebarOpen: state.sidebarOpen,
                  selectedLibrary: state.selectedLibrary,
                },
                version: 0,
              }).then(() => {
                console.log('[AppStore] ✓ Auth state saved to disk');
              }).catch(console.error);
            }
          }, 0);
        },

        clearAuthentication: () => {
          console.log('[AppStore] clearAuthentication called');
          set({
            isAuthenticated: false,
            currentUser: null,
            currentToken: null,
            selectedServer: null,
            serverConnection: null,
          });
          // Manually clear auth state after state update
          setTimeout(() => {
            if (typeof window !== 'undefined' && window.electron?.settings) {
              window.electron.settings.set('aio-media-manager-storage', {
                state: {
                  isAuthenticated: false,
                  currentUser: null,
                  currentToken: null,
                  selectedServer: null,
                  serverConnection: null,
                  sidebarOpen: true,
                  selectedLibrary: null,
                },
                version: 0,
              }).then(() => {
                console.log('[AppStore] ✓ Auth state cleared from disk');
              }).catch(console.error);
            }
          }, 0);
        },

        setServer: (server, connection) =>
          set({
            selectedServer: server,
            serverConnection: connection,
          }),

        setOnlineStatus: (online) =>
          set({ isOnline: online }),

        toggleSidebar: () =>
          set((state) => ({ sidebarOpen: !state.sidebarOpen })),

        setSidebarOpen: (open) =>
          set({ sidebarOpen: open }),

        selectLibrary: (library) =>
          set({ selectedLibrary: library }),

        toggleItemSelection: (ratingKey) =>
          set((state) => {
            const newSelection = new Set(state.selectedItems);
            if (newSelection.has(ratingKey)) {
              newSelection.delete(ratingKey);
            } else {
              newSelection.add(ratingKey);
            }
            return { selectedItems: newSelection };
          }),

        clearSelection: () =>
          set({ selectedItems: new Set() }),

        addOperation: (operation) =>
          set((state) => {
            const newOperations = new Map(state.activeOperations);
            newOperations.set(operation.id, operation);
            return { activeOperations: newOperations };
          }),

        updateOperation: (id, updates) =>
          set((state) => {
            const newOperations = new Map(state.activeOperations);
            const existing = newOperations.get(id);
            if (existing) {
              newOperations.set(id, { ...existing, ...updates });
            }
            return { activeOperations: newOperations };
          }),

        removeOperation: (id) =>
          set((state) => {
            const newOperations = new Map(state.activeOperations);
            newOperations.delete(id);
            return { activeOperations: newOperations };
          }),
      };
    },
    { name: 'AppStore' }
  )
);

/**
 * Manually rehydrate the store from saved state
 */
export async function rehydrateStore() {
  console.log('[AppStore] rehydrateStore() called');
  console.log('[AppStore] window.electron exists:', typeof window !== 'undefined' && !!window.electron);
  console.log('[AppStore] window.electron.settings exists:', typeof window !== 'undefined' && !!window.electron?.settings);
  
  if (typeof window === 'undefined' || !window.electron?.settings) {
    console.log('[AppStore] Not in Electron, skipping rehydration');
    return;
  }

  try {
    console.log('[AppStore] Rehydrating from saved state...');
    console.log('[AppStore] Calling window.electron.settings.get("aio-media-manager-storage")...');
    const saved = await window.electron.settings.get('aio-media-manager-storage');
    
    console.log('[AppStore] Raw saved data:', saved);
    console.log('[AppStore] saved exists:', !!saved);
    console.log('[AppStore] saved.state exists:', saved && !!saved.state);
    
    if (saved && saved.state) {
      console.log('[AppStore] Found saved state:', {
        isAuthenticated: saved.state.isAuthenticated,
        hasUser: !!saved.state.currentUser,
        hasToken: !!saved.state.currentToken,
        userName: saved.state.currentUser?.username,
      });
      
      // Restore the saved state
      const newState = {
        isAuthenticated: saved.state.isAuthenticated || false,
        currentUser: saved.state.currentUser || null,
        currentToken: saved.state.currentToken || null,
        selectedServer: saved.state.selectedServer || null,
        serverConnection: saved.state.serverConnection || null,
        sidebarOpen: saved.state.sidebarOpen !== undefined ? saved.state.sidebarOpen : true,
        selectedLibrary: saved.state.selectedLibrary || null,
      };
      
      console.log('[AppStore] Setting state to:', {
        isAuthenticated: newState.isAuthenticated,
        hasUser: !!newState.currentUser,
        hasToken: !!newState.currentToken,
      });
      
      useAppStore.setState(newState);
      
      // Verify the state was set
      const currentState = useAppStore.getState();
      console.log('[AppStore] ✓ Store rehydrated - verification:', {
        isAuthenticated: currentState.isAuthenticated,
        hasUser: !!currentState.currentUser,
        hasToken: !!currentState.currentToken,
      });
      
      // Mark as hydrated
      useAppStore.getState().markAsHydrated();
    } else {
      console.log('[AppStore] No saved state found (first run)');
      console.log('[AppStore] saved:', saved);
      // Still mark as hydrated even if no saved state
      useAppStore.getState().markAsHydrated();
    }
  } catch (error) {
    console.error('[AppStore] Failed to rehydrate:', error);
  }
}
