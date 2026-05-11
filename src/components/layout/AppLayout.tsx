import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveLayout, ResponsiveHeader } from './ResponsiveLayout';
import { useAppStore } from '@/store/appStore';
import { createPlexClient } from '@/api/plexClient';
import { createLibraryManager, type LibrarySection } from '@/managers/LibraryManager';
import { queryKeys } from '@/api/queryKeys';

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { serverConnection, selectedServer, currentUser, currentToken, clearAuthentication, selectLibrary, selectedLibrary } = useAppStore();

  // Fetch libraries from Plex server
  const { data: libraries, isLoading } = useQuery({
    queryKey: queryKeys.libraries,
    queryFn: async () => {
      if (!serverConnection || !currentToken) {
        throw new Error('No server connection or token');
      }

      const client = createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      });

      const manager = createLibraryManager(client);
      return manager.getLibrarySections();
    },
    enabled: !!serverConnection && !!currentToken,
  });

  const handleLogout = () => {
    clearAuthentication();
    navigate('/auth');
  };

  const handleLibraryClick = (library: LibrarySection) => {
    selectLibrary({
      key: library.key,
      title: library.title,
      type: library.type,
    });
    navigate(`/app/library/${library.key}`);
  };

  // Get icon for library type
  const getLibraryIcon = (type: string) => {
    switch (type) {
      case 'movie':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        );
      case 'show':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'artist':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
      case 'photo':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
    }
  };

  const sidebar = (
    <div className="flex flex-col h-full bg-secondary-50 dark:bg-secondary-900">
      {/* App branding */}
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex flex-col items-center">
          <img 
            src="./logo.png" 
            alt="AIO Media Manager" 
            className="h-16 w-auto"
            onError={(e) => {
              // Fallback if logo doesn't load
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Navigation - Libraries */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 mt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-9 bg-secondary-200 dark:bg-secondary-700 rounded-md animate-pulse" />
            ))}
          </div>
        ) : libraries && libraries.length > 0 ? (
          <>
            <div className="px-3 py-2 text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
              Libraries
            </div>
            {libraries.map((library) => (
              <button
                key={library.key}
                onClick={() => handleLibraryClick(library)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedLibrary?.key === library.key
                    ? 'bg-primary-500 text-white'
                    : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                }`}
              >
                {getLibraryIcon(library.type)}
                <span className="truncate">{library.title}</span>
              </button>
            ))}
          </>
        ) : (
          <div className="px-3 py-2 text-sm text-secondary-500 dark:text-secondary-400">
            No libraries found
          </div>
        )}

        <div className="pt-2 mt-2 border-t border-secondary-200 dark:border-secondary-700">
          <button
            onClick={() => navigate('/app/settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === '/app/settings'
                ? 'bg-primary-500 text-white'
                : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </button>
        </div>
      </nav>

      {/* User info and logout */}
      <div className="p-3 border-t border-secondary-200 dark:border-secondary-700">
        {currentUser && (
          <div className="mb-2 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold">
                {(currentUser.username || currentUser.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-secondary-50 truncate">
                  {currentUser.username || currentUser.email}
                </p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-md transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  const header = (
    <div className="flex items-center justify-between px-4 md:px-6 py-3 bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            // Toggle sidebar - this will be handled by ResponsiveLayout
          }}
          className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <ResponsiveLayout sidebar={sidebar} header={header}>
      <Outlet />
    </ResponsiveLayout>
  );
}
