import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';

/**
 * Smart root redirect that checks auth state
 * - If not hydrated: show loading
 * - If authenticated: redirect to /servers or /app
 * - If not authenticated: redirect to /auth
 */
export function RootRedirect() {
  const { isHydrated, currentToken, serverConnection } = useAppStore();

  // Wait for hydration
  if (!isHydrated) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
      }}>
        Loading...
      </div>
    );
  }

  // Not authenticated - go to auth page
  if (!currentToken) {
    return <Navigate to="/auth" replace />;
  }

  // Authenticated but no server - go to server selection
  if (!serverConnection) {
    return <Navigate to="/servers" replace />;
  }

  // Authenticated with server - go to app
  return <Navigate to="/app" replace />;
}
