import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { AuthenticationManager } from './AuthenticationManager';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('AuthenticationManager', () => {
  let authManager: AuthenticationManager;

  beforeEach(() => {
    authManager = new AuthenticationManager();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('generatePin', () => {
    it('should generate a PIN successfully', async () => {
      const mockResponse = {
        data: {
          id: 12345,
          code: 'ABCD1234',
          expiresAt: '2024-12-31T23:59:59Z',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await authManager.generatePin();

      expect(result).toEqual({
        id: 12345,
        code: 'ABCD1234',
        expiresAt: '2024-12-31T23:59:59Z',
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://plex.tv/api/v2/pins?strong=true',
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Plex-Product': expect.any(String),
            'X-Plex-Client-Identifier': expect.any(String),
          }),
        })
      );
    });
  });

  describe('pollPinStatus', () => {
    it('should return auth token when PIN is claimed', async () => {
      const mockResponse = {
        data: {
          authToken: 'test-token-123',
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await authManager.pollPinStatus(12345, 'ABCD1234');

      expect(result).toEqual({
        token: 'test-token-123',
      });
    });

    it('should return null when PIN is not claimed', async () => {
      const mockResponse = {
        data: {
          authToken: null,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await authManager.pollPinStatus(12345, 'ABCD1234');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await authManager.pollPinStatus(12345, 'ABCD1234');

      expect(result).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} });

      const result = await authManager.validateToken('valid-token');

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Unauthorized'));

      const result = await authManager.validateToken('invalid-token');

      expect(result).toBe(false);
    });
  });

  describe('token storage', () => {
    it('should store and retrieve token', async () => {
      await authManager.storeToken('user-123', 'token-abc');
      const retrieved = await authManager.getToken('user-123');

      expect(retrieved).toBe('token-abc');
    });

    it('should return null for non-existent user', async () => {
      const retrieved = await authManager.getToken('non-existent');

      expect(retrieved).toBeNull();
    });

    it('should clear all tokens', async () => {
      await authManager.storeToken('user-1', 'token-1');
      await authManager.storeToken('user-2', 'token-2');

      await authManager.clearTokens();

      const token1 = await authManager.getToken('user-1');
      const token2 = await authManager.getToken('user-2');

      expect(token1).toBeNull();
      expect(token2).toBeNull();
    });
  });

  describe('getUserInfo', () => {
    it('should retrieve user information', async () => {
      const mockResponse = {
        data: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          thumb: 'https://example.com/avatar.jpg',
          restricted: false,
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await authManager.getUserInfo('test-token');

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        thumb: 'https://example.com/avatar.jpg',
        isAdmin: true,
        isRestricted: false,
      });
    });
  });

  describe('getHomeUsers', () => {
    it('should retrieve Plex Home users', async () => {
      const mockResponse = {
        data: [
          {
            id: 'user-1',
            title: 'Admin User',
            username: 'admin',
            thumb: 'https://example.com/admin.jpg',
            admin: 1,
            restricted: 0,
            guest: 0,
          },
          {
            id: 'user-2',
            title: 'Regular User',
            username: 'user',
            thumb: 'https://example.com/user.jpg',
            admin: 0,
            restricted: 0,
            guest: 0,
          },
        ],
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await authManager.getHomeUsers('admin-token');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'user-1',
        title: 'Admin User',
        username: 'admin',
        thumb: 'https://example.com/admin.jpg',
        admin: true,
        restricted: false,
        guest: false,
      });
    });
  });

  describe('switchUser', () => {
    it('should switch to a different user', async () => {
      const mockResponse = {
        data: {
          authToken: 'new-user-token',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await authManager.switchUser('admin-token', 'user-2');

      expect(result).toEqual({
        token: 'new-user-token',
      });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://plex.tv/api/v2/home/users/user-2/switch',
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Plex-Token': 'admin-token',
          }),
        })
      );
    });
  });
});
