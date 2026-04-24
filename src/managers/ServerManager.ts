import axios from 'axios';
import type { PlexServer, ServerConnection } from '@/types';

/**
 * Connection test result
 */
export interface ConnectionResult {
  success: boolean;
  latency: number;
  error?: string;
}

/**
 * Server information
 */
export interface ServerInfo {
  machineIdentifier: string;
  version: string;
  platform: string;
  platformVersion: string;
  transcoderAudio: boolean;
  musicAnalysis: number;
  sync: boolean;
}

/**
 * Server capabilities
 */
export interface ServerCapabilities {
  transcoderAudio: boolean;
  musicAnalysis: boolean;
  sync: boolean;
  timeline: boolean;
  playqueue: boolean;
}

/**
 * Server Manager Interface
 */
export interface IServerManager {
  // Server discovery
  discoverServers(token: string): Promise<PlexServer[]>;
  selectServer(serverId: string): void;
  getCurrentServer(): PlexServer | null;

  // Connection management
  testConnection(connection: ServerConnection, token: string): Promise<ConnectionResult>;
  getOptimalConnection(server: PlexServer, token: string): Promise<ServerConnection>;

  // Server info
  getServerInfo(connection: ServerConnection, token: string): Promise<ServerInfo>;
  getServerCapabilities(connection: ServerConnection, token: string): Promise<ServerCapabilities>;
}

/**
 * Server Manager Implementation
 * Handles server discovery, connection testing, and server information retrieval
 */
export class ServerManager implements IServerManager {
  private readonly PLEX_TV_URL = 'https://plex.tv';
  private readonly CLIENT_IDENTIFIER: string;
  private readonly PRODUCT_NAME: string;
  private currentServer: PlexServer | null = null;

  constructor() {
    this.CLIENT_IDENTIFIER =
      import.meta.env.VITE_PLEX_CLIENT_IDENTIFIER || 'aio-media-manager';
    this.PRODUCT_NAME =
      import.meta.env.VITE_PLEX_PRODUCT || 'AIO Media Manager';
  }

  /**
   * Discover available Plex servers for the authenticated user
   */
  async discoverServers(token: string): Promise<PlexServer[]> {
    const response = await axios.get(
      `${this.PLEX_TV_URL}/api/v2/resources?includeHttps=1&includeRelay=1`,
      {
        headers: {
          'X-Plex-Token': token,
          'X-Plex-Product': this.PRODUCT_NAME,
          'X-Plex-Client-Identifier': this.CLIENT_IDENTIFIER,
        },
      }
    );

    // Filter for server resources only
    const servers = response.data.filter(
      (resource: any) => resource.provides === 'server'
    );

    return servers.map((server: any) => ({
      machineIdentifier: server.clientIdentifier,
      name: server.name,
      version: server.productVersion,
      connections: server.connections.map((conn: any) => ({
        protocol: conn.protocol,
        address: conn.address,
        port: conn.port,
        local: conn.local === 1,
        relay: conn.relay === 1,
        uri: conn.uri,
      })),
      owned: server.owned === 1,
      home: server.home === 1,
    }));
  }

  /**
   * Select a server as the current server
   */
  selectServer(serverId: string): void {
    // This would typically store the server ID and retrieve it from cache
    // For now, just a placeholder
  }

  /**
   * Get the currently selected server
   */
  getCurrentServer(): PlexServer | null {
    return this.currentServer;
  }

  /**
   * Test a connection to a server
   */
  async testConnection(
    connection: ServerConnection,
    token: string
  ): Promise<ConnectionResult> {
    const startTime = Date.now();

    try {
      await axios.get(`${connection.uri}/identity`, {
        headers: {
          'X-Plex-Token': token,
          'X-Plex-Product': this.PRODUCT_NAME,
          'X-Plex-Client-Identifier': this.CLIENT_IDENTIFIER,
        },
        timeout: 5000, // 5 second timeout
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Get the optimal connection for a server
   * Prioritizes: local > remote > relay
   */
  async getOptimalConnection(
    server: PlexServer,
    token: string
  ): Promise<ServerConnection> {
    // Prioritize connections: local first, then remote, then relay
    const prioritized = [...server.connections].sort((a, b) => {
      if (a.local && !b.local) return -1;
      if (!a.local && b.local) return 1;
      if (!a.relay && b.relay) return -1;
      if (a.relay && !b.relay) return 1;
      return 0;
    });

    // Test connections in priority order
    for (const connection of prioritized) {
      const result = await this.testConnection(connection, token);
      if (result.success) {
        return connection;
      }
    }

    // If no connection works, return the first one (will fail later)
    return prioritized[0] || server.connections[0]!;
  }

  /**
   * Get server information
   */
  async getServerInfo(
    connection: ServerConnection,
    token: string
  ): Promise<ServerInfo> {
    const response = await axios.get(`${connection.uri}/`, {
      headers: {
        'X-Plex-Token': token,
        'X-Plex-Product': this.PRODUCT_NAME,
        'X-Plex-Client-Identifier': this.CLIENT_IDENTIFIER,
      },
    });

    const data = response.data.MediaContainer;

    return {
      machineIdentifier: data.machineIdentifier,
      version: data.version,
      platform: data.platform,
      platformVersion: data.platformVersion,
      transcoderAudio: data.transcoderAudio === 1,
      musicAnalysis: data.musicAnalysis || 0,
      sync: data.sync === 1,
    };
  }

  /**
   * Get server capabilities
   */
  async getServerCapabilities(
    connection: ServerConnection,
    token: string
  ): Promise<ServerCapabilities> {
    const info = await this.getServerInfo(connection, token);

    return {
      transcoderAudio: info.transcoderAudio,
      musicAnalysis: info.musicAnalysis > 0,
      sync: info.sync,
      timeline: true, // Most servers support timeline
      playqueue: true, // Most servers support playqueue
    };
  }
}

// Export singleton instance
export const serverManager = new ServerManager();
