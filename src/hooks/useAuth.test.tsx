import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from './useAuth';
import { authManager } from '@/managers/AuthenticationManager';
import type { UserInfo } from '@/types';

// Mock the auth manager
vi.mock('@/managers/AuthenticationManager', () => ({
  authManager: {
    clearTokens: vi.fn(),
    validateToken: vi.fn(),
    getUserInfo: vi.fn(),
  },
}));

// Mock the router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the app store
const mockSetAuthentication = vi.fn();
const mockClearAuthentication = vi.fn();
let mockIsAuthenticated = true;
let mockCurrentUser: UserInfo | null = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  thumb: 'https://example.com/thumb.jpg',
  isAdmin: true,
  isRestricted: false,
};
let mockCurrentToken: string | null = 'test-token';

vi.mock('@/store/appStore', () => ({
  useAppStore: (selector: any) => {
    const store = {
      isAuthenticated: mockIsAuthenticated,
      currentUser: mockCurrentUser,
      currentToken: mockCurrentToken,
      setAuthentication: mockSetAuthentication,
      clearAuthentication: mockClearAuthentication,
    };
    return selector ? selector(store) : store;
  },
}));

// Wrapper for hooks that need router
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock values
    mockIsAuthenticated = true;
    mockCurrentUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      thumb: 'https://example.com/thumb.jpg',
      isAdmin: true,
      isRestricted: false,
    };
    mockCurrentToken = 'test-token';
  });

  describe('State', () => {
    it('should return authentication state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.currentUser).toEqual(mockCurrentUser);
      expect(result.current.currentToken).toBe(mockCurrentToken);
    });

    it('should return isAdmin flag', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAdmin).toBe(true);
    });

    it('should return isRestricted flag', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isRestricted).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should clear tokens', async () => {
      vi.mocked(authManager.clearTokens).mockResolvedValue();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(authManager.clearTokens).toHaveBeenCalled();
    });

    it('should clear authentication state', async () => {
      vi.mocked(authManager.clearTokens).mockResolvedValue();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockClearAuthentication).toHaveBeenCalled();
    });

    it('should navigate to auth page', async () => {
      vi.mocked(authManager.clearTokens).mockResolvedValue();

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });

    it('should handle clearTokens failure gracefully', async () => {
      vi.mocked(authManager.clearTokens).mockRejectedValue(
        new Error('Clear failed')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      // Should still clear state and navigate
      expect(mockClearAuthentication).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/auth');
    });
  });

  describe('validateSession', () => {
    it('should return false when no token', async () => {
      mockCurrentToken = null;
      vi.mocked(authManager.validateToken).mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let isValid: boolean = false;
      await act(async () => {
        isValid = await result.current.validateSession();
      });

      expect(isValid).toBe(false);
      expect(authManager.validateToken).not.toHaveBeenCalled();
    });

    it('should validate token with auth manager', async () => {
      vi.mocked(authManager.validateToken).mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.validateSession();
      });

      expect(authManager.validateToken).toHaveBeenCalledWith(mockCurrentToken);
    });

    it('should return true for valid token', async () => {
      vi.mocked(authManager.validateToken).mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let isValid: boolean = false;
      await act(async () => {
        isValid = await result.current.validateSession();
      });

      expect(isValid).toBe(true);
    });

    it('should return false and clear auth for invalid token', async () => {
      vi.mocked(authManager.validateToken).mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let isValid: boolean = true;
      await act(async () => {
        isValid = await result.current.validateSession();
      });

      expect(isValid).toBe(false);
      expect(mockClearAuthentication).toHaveBeenCalled();
    });

    it('should handle validation error', async () => {
      vi.mocked(authManager.validateToken).mockRejectedValue(
        new Error('Validation failed')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      let isValid: boolean = true;
      await act(async () => {
        isValid = await result.current.validateSession();
      });

      expect(isValid).toBe(false);
    });
  });

  describe('refreshUserInfo', () => {
    it('should throw error when no token', async () => {
      mockCurrentToken = null;

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(async () => {
        await act(async () => {
          await result.current.refreshUserInfo();
        });
      }).rejects.toThrow('No authentication token available');
    });

    it('should get user info from auth manager', async () => {
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockCurrentUser!);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshUserInfo();
      });

      expect(authManager.getUserInfo).toHaveBeenCalledWith(mockCurrentToken);
    });

    it('should update authentication state', async () => {
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockCurrentUser!);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshUserInfo();
      });

      expect(mockSetAuthentication).toHaveBeenCalledWith(
        mockCurrentUser,
        mockCurrentToken
      );
    });

    it('should return updated user info', async () => {
      const updatedUser = { ...mockCurrentUser!, username: 'updated' };
      vi.mocked(authManager.getUserInfo).mockResolvedValue(updatedUser);

      const { result } = renderHook(() => useAuth(), { wrapper });

      let userInfo: UserInfo | undefined;
      await act(async () => {
        userInfo = await result.current.refreshUserInfo();
      });

      expect(userInfo).toEqual(updatedUser);
    });

    it('should throw error on failure', async () => {
      vi.mocked(authManager.getUserInfo).mockRejectedValue(
        new Error('Refresh failed')
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(async () => {
        await act(async () => {
          await result.current.refreshUserInfo();
        });
      }).rejects.toThrow('Refresh failed');
    });
  });

  describe('Actions', () => {
    it('should expose setAuthentication', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.setAuthentication).toBe(mockSetAuthentication);
    });

    it('should expose clearAuthentication', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.clearAuthentication).toBe(mockClearAuthentication);
    });
  });
});
