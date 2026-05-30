import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ResponsiveLayout, ResponsiveHeader } from './ResponsiveLayout';
import { 
  SidebarNav, 
  SidebarSection, 
  SidebarItem, 
  SidebarFooter,
  SidebarUser,
  SidebarDivider
} from './Sidebar';
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
    <>
      {/* Logo */}
      <div className="pt-3">
        <img 
          src="/logo.png" 
          alt="AIO Media Manager" 
          className="w-full h-auto block"
        />
      </div>

      {/* Navigation */}
      <SidebarNav>
        {/* Libraries */}
        {isLoading ? (
          <div className="space-y-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg animate-pulse" style={{ background: '#F1F5F9' }} />
            ))}
          </div>
        ) : libraries && libraries.length > 0 ? (
          <SidebarSection title="Libraries">
            {libraries.map((library) => (
              <SidebarItem
                key={library.key}
                icon={getLibraryIcon(library.type)}
                label={library.title}
                isActive={selectedLibrary?.key === library.key}
                onClick={() => handleLibraryClick(library)}
              />
            ))}
          </SidebarSection>
        ) : (
          <div className="px-4 py-3 text-sm text-center" style={{ color: '#94A3B8' }}>
            No libraries found
          </div>
        )}

        {/* Settings */}
        <div className="sidebar-nav-section">
          <SidebarItem
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            label="Settings"
            isActive={location.pathname === '/app/settings'}
            onClick={() => navigate('/app/settings')}
          />
        </div>
      </SidebarNav>

      {/* User info and logout */}
      <SidebarFooter>
        {currentUser && (
          <SidebarUser
            username={currentUser.username}
            email={currentUser.email}
          />
        )}
        <div className="sidebar-nav-section">
          <SidebarItem
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            }
            label="Logout"
            onClick={handleLogout}
          />
        </div>
      </SidebarFooter>
    </>
  );

  return (
    <ResponsiveLayout sidebar={sidebar}>
      <Outlet />
    </ResponsiveLayout>
  );
}
