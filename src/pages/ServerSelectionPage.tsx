import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { serverManager } from '@/managers/ServerManager';
import { useAppStore } from '@/store/appStore';
import type { PlexServer, ServerConnection } from '@/types';

interface ServerWithStatus extends PlexServer {
  testing?: boolean;
  connected?: boolean;
  latency?: number;
  error?: string;
}

/**
 * ServerSelectionPage Component
 * 
 * Discovers and displays available Plex servers for the authenticated user.
 * Allows user to select a server and tests the connection before proceeding.
 */
export function ServerSelectionPage() {
  const navigate = useNavigate();
  const { currentToken, setServer } = useAppStore();
  
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [autoConnecting, setAutoConnecting] = useState(false);

  /**
   * Discover available servers on mount
   */
  useEffect(() => {
    const discoverServers = async () => {
      if (!currentToken) {
        setError('No authentication token found. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const discoveredServers = await serverManager.discoverServers(currentToken);
        
        if (discoveredServers.length === 0) {
          setError('No Plex servers found. Make sure your server is running and accessible.');
        } else {
          setServers(discoveredServers);
          
          // Auto-select and connect immediately if only one server found
          if (discoveredServers.length === 1) {
            console.log('[ServerSelection] Only one server found, auto-connecting:', discoveredServers[0].name);
            setAutoConnecting(true);
            // Connect immediately without showing the selection page
            handleServerSelect(discoveredServers[0]);
          }
        }
      } catch (err) {
        console.error('Failed to discover servers:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to discover servers. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    discoverServers();
  }, [currentToken]);

  /**
   * Handle server selection and connection
   */
  const handleServerSelect = async (server: ServerWithStatus) => {
    if (!currentToken || connecting) return;

    setSelectedServerId(server.machineIdentifier);
    setConnecting(true);

    try {
      // Find optimal connection
      const optimalConnection = await serverManager.getOptimalConnection(
        server,
        currentToken
      );

      // Test the connection
      const testResult = await serverManager.testConnection(
        optimalConnection,
        currentToken
      );

      if (!testResult.success) {
        throw new Error(testResult.error || 'Connection test failed');
      }

      // Update server status
      setServers(prev =>
        prev.map(s =>
          s.machineIdentifier === server.machineIdentifier
            ? { ...s, connected: true, latency: testResult.latency }
            : s
        )
      );

      // Store in app state
      setServer(server, optimalConnection);

      // Navigate to main app immediately
      navigate('/app/library');
    } catch (err) {
      console.error('Failed to connect to server:', err);
      
      // Update server status with error
      setServers(prev =>
        prev.map(s =>
          s.machineIdentifier === server.machineIdentifier
            ? {
                ...s,
                connected: false,
                error: err instanceof Error ? err.message : 'Connection failed',
              }
            : s
        )
      );
      
      setSelectedServerId(null);
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Get connection type badge
   */
  const getConnectionBadge = (connections: ServerConnection[]) => {
    const hasLocal = connections.some(c => c.local);
    const hasRelay = connections.some(c => c.relay);
    
    if (hasLocal) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
          Local
        </span>
      );
    } else if (hasRelay) {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
          Relay
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
          Remote
        </span>
      );
    }
  };

  if (loading || autoConnecting) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            {autoConnecting ? 'Connecting to server...' : 'Discovering servers...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-red-600 dark:text-red-400 mb-4 flex justify-center">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            No Servers Found
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Select a Server
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a Plex Media Server to connect to
          </p>
        </div>

        {/* Server List */}
        <div className="grid gap-4 md:grid-cols-2">
          {servers.map((server) => (
            <button
              key={server.machineIdentifier}
              onClick={() => handleServerSelect(server)}
              disabled={connecting && selectedServerId !== server.machineIdentifier}
              className={`
                p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md
                hover:shadow-lg transition-all text-left
                ${selectedServerId === server.machineIdentifier ? 'ring-2 ring-blue-500' : ''}
                ${connecting && selectedServerId !== server.machineIdentifier ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                disabled:cursor-not-allowed
              `}
            >
              {/* Server Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {server.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Version {server.version}
                  </p>
                </div>
                {server.owned && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                    Owned
                  </span>
                )}
              </div>

              {/* Connection Info */}
              <div className="flex items-center gap-2 mb-3">
                {getConnectionBadge(server.connections)}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {server.connections.length} connection{server.connections.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Status */}
              {connecting && selectedServerId === server.machineIdentifier && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <span className="text-sm">Connecting...</span>
                </div>
              )}

              {server.connected && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Connected ({server.latency}ms)</span>
                </div>
              )}

              {server.error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {server.error}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/auth')}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServerSelectionPage;
