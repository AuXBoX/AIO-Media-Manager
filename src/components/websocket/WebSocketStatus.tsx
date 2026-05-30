import { useWebSocket } from '@/hooks/useWebSocket';
import { ConnectionState } from '@/api/plexWebSocket';

/**
 * WebSocket Status Indicator Component
 * 
 * Displays the current WebSocket connection status and provides
 * manual connect/disconnect controls.
 */
export function WebSocketStatus() {
  const { connectionState, isConnected, reconnectAttempts, connect, disconnect } = useWebSocket();

  const getStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'bg-green-500';
      case ConnectionState.CONNECTING:
      case ConnectionState.RECONNECTING:
        return 'bg-yellow-500';
      case ConnectionState.ERROR:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionState) {
      case ConnectionState.CONNECTED:
        return 'Connected';
      case ConnectionState.CONNECTING:
        return 'Connecting...';
      case ConnectionState.RECONNECTING:
        return `Reconnecting (attempt ${reconnectAttempts})...`;
      case ConnectionState.ERROR:
        return 'Error';
      case ConnectionState.DISCONNECTED:
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getStatusText()}
        </span>
      </div>

      {/* Manual Controls */}
      <div className="flex gap-1 ml-auto">
        {!isConnected && (
          <button
            onClick={connect}
            className="px-2 py-1 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 transition-colors"
            disabled={connectionState === ConnectionState.CONNECTING}
          >
            Connect
          </button>
        )}
        {isConnected && (
          <button
            onClick={disconnect}
            className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
