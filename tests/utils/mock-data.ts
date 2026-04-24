import type { PlexServer, ServerConnection, UserInfo } from '@/types';

/**
 * Mock data for testing
 */

export const mockServerConnection: ServerConnection = {
  protocol: 'https',
  address: '192.168.1.100',
  port: 32400,
  local: true,
  relay: false,
  uri: 'https://192.168.1.100:32400',
};

export const mockPlexServer: PlexServer = {
  machineIdentifier: 'test-server-123',
  name: 'Test Plex Server',
  version: '1.32.0',
  connections: [mockServerConnection],
  owned: true,
  home: true,
};

export const mockUserInfo: UserInfo = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  thumb: 'https://example.com/avatar.jpg',
  isAdmin: true,
  isRestricted: false,
};

export const mockAuthToken = 'mock-auth-token-12345';
