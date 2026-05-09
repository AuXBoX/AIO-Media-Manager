import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import {
  getWebSocketClient,
  initializeWebSocketClient,
  ConnectionState,
  NotificationType,
  type NotificationContainer,
  type TimelineEntry,
  type ActivityNotification,
} from '@/api/plexWebSocket';

/**
 * WebSocket hook return type
 */
export interface UseWebSocketReturn {
  connectionState: ConnectionState;
  isConnected: boolean;
  reconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook for managing WebSocket connection
 * 
 * Automatically connects when server and token are available,
 * and handles reconnection on server/token changes.
 */
export function useWebSocket(): UseWebSocketReturn {
  const { serverConnection, currentToken, isOnline } = useAppStore();
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const connect = useCallback(() => {
    if (!serverConnection || !currentToken) {
      console.warn('Cannot connect WebSocket: missing server or token');
      return;
    }

    try {
      const client = initializeWebSocketClient({
        serverUrl: serverConnection.uri,
        token: currentToken,
        autoReconnect: true,
      });

      client.connect();
    } catch (error) {
      console.error('Failed to initialize WebSocket client:', error);
    }
  }, [serverConnection, currentToken]);

  const disconnect = useCallback(() => {
    try {
      const client = getWebSocketClient();
      client.disconnect();
    } catch (error) {
      // Client not initialized, ignore
    }
  }, []);

  // Auto-connect when server and token are available
  useEffect(() => {
    if (serverConnection && currentToken && isOnline) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [serverConnection, currentToken, isOnline, connect, disconnect]);

  // Listen to connection state changes
  useEffect(() => {
    try {
      const client = getWebSocketClient();

      const handleStateChange = (state: ConnectionState) => {
        setConnectionState(state);
      };

      const handleReconnecting = ({ attempt }: { attempt: number }) => {
        setReconnectAttempts(attempt);
      };

      const handleConnected = () => {
        setReconnectAttempts(0);
      };

      client.on('state-change', handleStateChange);
      client.on('reconnecting', handleReconnecting);
      client.on('connected', handleConnected);

      // Set initial state
      setConnectionState(client.getConnectionState());

      return () => {
        client.off('state-change', handleStateChange);
        client.off('reconnecting', handleReconnecting);
        client.off('connected', handleConnected);
      };
    } catch (error) {
      // Client not initialized yet
      return undefined;
    }
  }, []);

  return {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    reconnectAttempts,
    connect,
    disconnect,
  };
}

/**
 * Hook for listening to specific notification types
 */
export function useWebSocketNotification(
  type: NotificationType,
  handler: (container: NotificationContainer) => void
): void {
  useEffect(() => {
    try {
      const client = getWebSocketClient();

      client.on(type, handler);

      return () => {
        client.off(type, handler);
      };
    } catch (error) {
      // Client not initialized
      return undefined;
    }
  }, [type, handler]);
}

/**
 * Hook for listening to timeline updates
 */
export function useTimelineUpdates(
  handler: (entries: TimelineEntry[]) => void
): void {
  const handleNotification = useCallback(
    (container: NotificationContainer) => {
      if (container.TimelineEntry) {
        handler(container.TimelineEntry);
      }
    },
    [handler]
  );

  useWebSocketNotification(NotificationType.TIMELINE, handleNotification);
}

/**
 * Hook for listening to activity updates
 */
export function useActivityUpdates(
  handler: (activities: ActivityNotification[]) => void
): void {
  const handleNotification = useCallback(
    (container: NotificationContainer) => {
      if (container.ActivityNotification) {
        handler(container.ActivityNotification);
      }
    },
    [handler]
  );

  useWebSocketNotification(NotificationType.ACTIVITY, handleNotification);
}

/**
 * Hook for listening to all notifications
 */
export function useAllNotifications(
  handler: (notification: { type: NotificationType; container: NotificationContainer }) => void
): void {
  useEffect(() => {
    try {
      const client = getWebSocketClient();

      client.on('notification', handler);

      return () => {
        client.off('notification', handler);
      };
    } catch (error) {
      // Client not initialized
      return undefined;
    }
  }, [handler]);
}
