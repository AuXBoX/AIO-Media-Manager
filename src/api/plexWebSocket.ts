import { EventEmitter } from 'events';
import { queryClient } from './queryClient';
import { queryKeys } from './queryKeys';

/**
 * WebSocket connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Plex notification types
 */
export enum NotificationType {
  TIMELINE = 'timeline',
  STATUS = 'status',
  ACTIVITY = 'activity',
  PROGRESS = 'progress',
  PLAYING = 'playing',
  REACHABILITY = 'reachability',
}

/**
 * Timeline entry from Plex notifications
 */
export interface TimelineEntry {
  identifier: string;
  itemID: number;
  metadataState?: string;
  state?: number;
  title?: string;
  type: number;
  updatedAt: number;
}

/**
 * Activity notification from Plex
 */
export interface ActivityNotification {
  event: string;
  Activity?: {
    uuid: string;
    type: string;
    cancellable: boolean;
    userID: number;
    title: string;
    subtitle: string;
    progress: number;
  };
}

/**
 * Status notification from Plex
 */
export interface StatusNotification {
  title: string;
  notificationName: string;
}

/**
 * Notification container from Plex WebSocket
 */
export interface NotificationContainer {
  type: NotificationType;
  size?: number;
  TimelineEntry?: TimelineEntry[];
  ActivityNotification?: ActivityNotification[];
  StatusNotification?: StatusNotification[];
  PlaySessionStateNotification?: any[];
  ReachabilityNotification?: any[];
  ProgressNotification?: any[];
}

/**
 * WebSocket client configuration
 */
export interface WebSocketConfig {
  serverUrl: string;
  token: string;
  filters?: string;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
  maxReconnectDelay?: number;
}

/**
 * Plex WebSocket Client
 * 
 * Manages real-time notifications from Plex Media Server via WebSocket connection.
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Event emission for different notification types
 * - React Query cache invalidation integration
 * - Connection state management
 */
export class PlexWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastMessageTime = 0;

  constructor(config: WebSocketConfig) {
    super();
    
    this.config = {
      filters: '-log', // Exclude log events by default
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectBaseDelay: 1000,
      maxReconnectDelay: 30000,
      ...config,
    };
  }

  /**
   * Connect to Plex WebSocket server
   */
  connect(): void {
    if (this.connectionState === ConnectionState.CONNECTED || 
        this.connectionState === ConnectionState.CONNECTING) {
      return;
    }

    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      // Convert HTTP(S) URL to WS(S) URL
      const wsUrl = this.buildWebSocketUrl();
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      
    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR);
      this.emit('error', error);
      this.attemptReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.config.autoReconnect = false;
    this.cleanup();
    this.setConnectionState(ConnectionState.DISCONNECTED);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED;
  }

  /**
   * Update server URL and token
   */
  updateConfig(serverUrl: string, token: string): void {
    const wasConnected = this.isConnected();
    
    this.config.serverUrl = serverUrl;
    this.config.token = token;
    
    if (wasConnected) {
      this.disconnect();
      this.config.autoReconnect = true;
      this.connect();
    }
  }

  /**
   * Build WebSocket URL from server URL
   */
  private buildWebSocketUrl(): string {
    const wsProtocol = this.config.serverUrl.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = this.config.serverUrl.replace(/^https?:\/\//, '');
    
    const params = new URLSearchParams({
      'X-Plex-Token': this.config.token,
    });
    
    if (this.config.filters) {
      params.append('filters', this.config.filters);
    }
    
    return `${wsProtocol}://${baseUrl}/:/websocket/notifications?${params.toString()}`;
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    this.setConnectionState(ConnectionState.CONNECTED);
    this.reconnectAttempts = 0;
    this.lastMessageTime = Date.now();
    
    // Start heartbeat monitoring
    this.startHeartbeat();
    
    this.emit('connected');
  }

  /**
   * Handle WebSocket message event
   */
  private handleMessage(event: MessageEvent): void {
    this.lastMessageTime = Date.now();
    
    try {
      const data = JSON.parse(event.data);
      
      if (data.NotificationContainer) {
        this.handleNotification(data.NotificationContainer);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.setConnectionState(ConnectionState.ERROR);
    this.emit('error', event);
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent): void {
    console.log('WebSocket closed:', event.code, event.reason);
    
    this.cleanup();
    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.emit('disconnected', { code: event.code, reason: event.reason });
    
    if (this.config.autoReconnect) {
      this.attemptReconnect();
    }
  }

  /**
   * Handle notification from Plex
   */
  private handleNotification(container: NotificationContainer): void {
    const { type } = container;
    
    // Emit specific event for notification type
    this.emit('notification', { type, container });
    this.emit(type, container);
    
    // Handle specific notification types
    switch (type) {
      case NotificationType.TIMELINE:
        this.handleTimelineNotification(container);
        break;
      case NotificationType.STATUS:
        this.handleStatusNotification(container);
        break;
      case NotificationType.ACTIVITY:
        this.handleActivityNotification(container);
        break;
      case NotificationType.PLAYING:
        this.handlePlayingNotification(container);
        break;
    }
  }

  /**
   * Handle timeline notification (metadata changes)
   */
  private handleTimelineNotification(container: NotificationContainer): void {
    if (!container.TimelineEntry) return;
    
    for (const entry of container.TimelineEntry) {
      // Invalidate relevant queries based on timeline entry
      this.invalidateQueriesForTimelineEntry(entry);
    }
  }

  /**
   * Handle status notification (library updates)
   */
  private handleStatusNotification(container: NotificationContainer): void {
    if (!container.StatusNotification) return;
    
    for (const status of container.StatusNotification) {
      // Invalidate library queries on status changes
      if (status.notificationName?.includes('library')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.libraries });
      }
    }
  }

  /**
   * Handle activity notification (background tasks)
   */
  private handleActivityNotification(container: NotificationContainer): void {
    if (!container.ActivityNotification) return;
    
    for (const activity of container.ActivityNotification) {
      // Emit activity events for UI updates
      this.emit('activity', activity);
    }
  }

  /**
   * Handle playing notification (playback state)
   */
  private handlePlayingNotification(container: NotificationContainer): void {
    if (!container.PlaySessionStateNotification) return;
    
    // Emit playback events
    this.emit('playback', container.PlaySessionStateNotification);
  }

  /**
   * Invalidate React Query cache based on timeline entry
   */
  private invalidateQueriesForTimelineEntry(entry: TimelineEntry): void {
    const ratingKey = entry.itemID?.toString();
    
    if (!ratingKey) return;
    
    // Invalidate metadata queries
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.metadata(ratingKey) 
    });
    
    // Invalidate children/grandchildren queries
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.metadataChildren(ratingKey) 
    });
    
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.metadataGrandchildren(ratingKey) 
    });
    
    // Invalidate artwork queries
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.metadataArtwork(ratingKey) 
    });
    
    // Invalidate library items queries (for list updates)
    queryClient.invalidateQueries({ 
      queryKey: ['library'],
      predicate: (query) => {
        // Invalidate library items queries
        return query.queryKey[0] === 'library' && 
               query.queryKey[2] === 'items';
      }
    });
    
    // Invalidate recently added/played queries
    queryClient.invalidateQueries({ 
      queryKey: ['library'],
      predicate: (query) => {
        return query.queryKey[0] === 'library' && 
               (query.queryKey[2] === 'recentlyAdded' || 
                query.queryKey[2] === 'recentlyPlayed');
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.emit('reconnect-failed');
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState(ConnectionState.RECONNECTING);

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts, 
      delay 
    });

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    // Check for stale connection every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime;
      
      // If no message received in 60 seconds, consider connection stale
      if (timeSinceLastMessage > 60000) {
        console.warn('WebSocket connection appears stale, reconnecting...');
        this.cleanup();
        this.attemptReconnect();
      }
    }, 30000);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('state-change', state);
    }
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      
      if (this.ws.readyState === WebSocket.OPEN || 
          this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      
      this.ws = null;
    }
  }
}

/**
 * Singleton instance of WebSocket client
 */
let webSocketClient: PlexWebSocketClient | null = null;

/**
 * Get or create WebSocket client instance
 */
export function getWebSocketClient(config?: WebSocketConfig): PlexWebSocketClient {
  if (!webSocketClient && config) {
    webSocketClient = new PlexWebSocketClient(config);
  }
  
  if (!webSocketClient) {
    throw new Error('WebSocket client not initialized. Provide config on first call.');
  }
  
  return webSocketClient;
}

/**
 * Initialize WebSocket client with config
 */
export function initializeWebSocketClient(config: WebSocketConfig): PlexWebSocketClient {
  if (webSocketClient) {
    webSocketClient.disconnect();
  }
  
  webSocketClient = new PlexWebSocketClient(config);
  return webSocketClient;
}

/**
 * Destroy WebSocket client instance
 */
export function destroyWebSocketClient(): void {
  if (webSocketClient) {
    webSocketClient.disconnect();
    webSocketClient.removeAllListeners();
    webSocketClient = null;
  }
}
