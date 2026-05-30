import { Navigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { PageLoadingState } from '@/components/ui/LoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireServer?: boolean; // Whether this route requires a server connection
}

export function ProtectedRoute({ children, requireServer = true }: ProtectedRouteProps) {
  const { isHydrated, currentToken, serverConnection } = useAppStore();

  // Wait for hydration to complete before checking auth
  if (!isHydrated) {
    return <PageLoadingState message="Loading..." />;
  }

  // If no token, redirect to authentication
  if (!currentToken) {
    return <Navigate to="/auth" replace />;
  }

  // If token but no server connection (and server is required), redirect to server selection
  if (requireServer && !serverConnection) {
    return <Navigate to="/servers" replace />;
  }

  return <>{children}</>;
}
