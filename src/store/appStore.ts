import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { UserInfo, PlexServer, ServerConnection } from '@/types';
import { electronStorage } from '@/utils/electronStorage';

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
    persist(
      (set) => {
        console.log('[AppStore] Creating store...');
        
        return {
          // Initial state
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
          setAuthentication: (user, token) => {
            console.log('[AppStore] setAuthentication called');
            set({
              isAuthenticated: true,
              currentUser: user,
              currentToken: token,
            });
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
      {
        name: 'aio-media-manager-storage',
        storage: createJSONStorage(() => electronStorage),
        skipHydration: false, // Allow hydration
        partialize: (state) => {
          console.log('[AppStore] Partializing state for persistence');
          const partialState = {
            // Persist authentication and server state
            isAuthenticated: state.isAuthenticated,
            currentUser: state.currentUser,
            currentToken: state.currentToken,
            selectedServer: state.selectedServer,
            serverConnection: state.serverConnection,
            // UI preferences
            sidebarOpen: state.sidebarOpen,
            selectedLibrary: state.selectedLibrary,
          };
          console.log('[AppStore] Partial state:', {
            isAuthenticated: partialState.isAuthenticated,
            hasUser: !!partialState.currentUser,
            hasToken: !!partialState.currentToken,
            hasServer: !!partialState.selectedServer,
          });
          return partialState;
        },
        onRehydrateStorage: () => {
          console.log('[AppStore] Starting rehydration...');
          return (state, error) => {
            if (error) {
              console.error('[AppStore] ✗ Rehydration failed:', error);
            } else {
              console.log('[AppStore] ✓ Rehydration complete');
              console.log('[AppStore] Rehydrated state:', {
                isAuthenticated: state?.isAuthenticated,
                hasUser: !!state?.currentUser,
                hasToken: !!state?.currentToken,
                hasServer: !!state?.selectedServer,
              });
            }
          };
        },
      }
    ),
    { name: 'AppStore' }
  )
);
