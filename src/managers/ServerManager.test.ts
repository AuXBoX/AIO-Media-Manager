import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { ServerManager } from './ServerManager';
import { mockPlexServer, mockServerConnection } from '../../tests/utils/mock-data';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('ServerManager', () => {
  let serverManager: ServerManager;

  beforeEach(() => {
    serverManager = new ServerManager();
    vi.clearAllMocks();
  });

  describe('discoverServers', () => {
    it('should discover available servers', async () => {
      const mockResponse = {
        data: [
          {
            provides: 'server',
            clientIdentifier: 'server-123',
            name: 'Test Server',
            productVersion: '1.32.0',
            owned: 1,
            home: 1,
            connections: [
              {
                protocol: 'https',
                address: '192.168.1.100',
                port: 32400,
                local: 1,
                relay: 0,
                uri: 'https://192.168.1.100:32400',
              },
            ],
          },
        ],
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await serverManager.discoverServers('test-token');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        machineIdentifier: 'server-123',
        name: 'Test Server',
        version: '1.32.0',
        owned: true,
        home: true,
        connections: [
          {
            protocol: 'https',
            address: '192.168.1.100',
            port: 32400,
            local: true,
            relay: false,
            uri: 'https://192.168.1.100:32400',
          },
        ],
      });
    });

    it('should filter out non-server resources', async () => {
      const mockResponse = {
        data: [
          {
            provides: 'server',
            clientIdentifier: 'server-123',
            name: 'Test Server',
            productVersion: '1.32.0',
            owned: 1,
            home: 1,
            connections: [],
          },
          {
            provides: 'player',
            clientIdentifier: 'player-456',
            name: 'Test Player',
          },
        ],
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await serverManager.discoverServers('test-token');

      expect(result).toHaveLength(1);
      expect(result[0]?.machineIdentifier).toBe('server-123');
    });
  });

  describe('testConnection', () => {
    it('should return success for working connection', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      const result = await serverManager.testConnection(
        mockServerConnection,
        'test-token'
      );

      expect(result.success).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should return failure for non-working connection', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection timeout'));

      const result = await serverManager.testConnection(
        mockServerConnection,
        'test-token'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getOptimalConnection', () => {
    it('should prioritize local connections', async () => {
      const server = {
        ...mockPlexServer,
        connections: [
          {
            protocol: 'https' as const,
            address: 'remote.example.com',
            port: 32400,
            local: false,
            relay: false,
            uri: 'https://remote.example.com:32400',
          },
          {
            protocol: 'https' as const,
            address: '192.168.1.100',
            port: 32400,
            local: true,
            relay: false,
            uri: 'https://192.168.1.100:32400',
          },
        ],
      };

      mockedAxios.get.mockResolvedValue({ data: {} });

      const result = await serverManager.getOptimalConnection(
        server,
        'test-token'
      );

      expect(result.local).toBe(true);
      expect(result.address).toBe('192.168.1.100');
    });

    it('should fall back to remote if local fails', async () => {
      const server = {
        ...mockPlexServer,
        connections: [
          {
            protocol: 'https' as const,
            address: '192.168.1.100',
            port: 32400,
            local: true,
            relay: false,
            uri: 'https://192.168.1.100:32400',
          },
          {
            protocol: 'https' as const,
            address: 'remote.example.com',
            port: 32400,
            local: false,
            relay: false,
            uri: 'https://remote.example.com:32400',
          },
        ],
      };

      // First call (local) fails, second call (remote) succeeds
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ data: {} });

      const result = await serverManager.getOptimalConnection(
        server,
        'test-token'
      );

      expect(result.local).toBe(false);
      expect(result.address).toBe('remote.example.com');
    });
  });

  describe('getServerInfo', () => {
    it('should retrieve server information', async () => {
      const mockResponse = {
        data: {
          MediaContainer: {
            machineIdentifier: 'server-123',
            version: '1.32.0',
            platform: 'Linux',
            platformVersion: '5.10.0',
            transcoderAudio: 1,
            musicAnalysis: 2,
            sync: 1,
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await serverManager.getServerInfo(
        mockServerConnection,
        'test-token'
      );

      expect(result).toEqual({
        machineIdentifier: 'server-123',
        version: '1.32.0',
        platform: 'Linux',
        platformVersion: '5.10.0',
        transcoderAudio: true,
        musicAnalysis: 2,
        sync: true,
      });
    });
  });

  describe('getServerCapabilities', () => {
    it('should retrieve server capabilities', async () => {
      const mockResponse = {
        data: {
          MediaContainer: {
            machineIdentifier: 'server-123',
            version: '1.32.0',
            platform: 'Linux',
            platformVersion: '5.10.0',
            transcoderAudio: 1,
            musicAnalysis: 2,
            sync: 1,
          },
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await serverManager.getServerCapabilities(
        mockServerConnection,
        'test-token'
      );

      expect(result).toEqual({
        transcoderAudio: true,
        musicAnalysis: true,
        sync: true,
        timeline: true,
        playqueue: true,
      });
    });
  });
});
