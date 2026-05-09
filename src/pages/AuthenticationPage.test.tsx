import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthenticationPage } from './AuthenticationPage';
import { authManager } from '@/managers/AuthenticationManager';
import type { PinResponse, AuthToken, UserInfo } from '@/managers/AuthenticationManager';

// Mock the auth manager
vi.mock('@/managers/AuthenticationManager', () => ({
  authManager: {
    generatePin: vi.fn(),
    pollPinStatus: vi.fn(),
    getUserInfo: vi.fn(),
    storeToken: vi.fn(),
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
vi.mock('@/store/appStore', () => ({
  useAppStore: (selector: any) => {
    const store = {
      setAuthentication: mockSetAuthentication,
    };
    return selector ? selector(store) : store;
  },
}));

// Helper to render with router
function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe('AuthenticationPage', () => {
  const mockPin: PinResponse = {
    id: 12345,
    code: 'ABCD',
    expiresAt: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
  };

  const mockAuthToken: AuthToken = {
    token: 'test-auth-token',
  };

  const mockUserInfo: UserInfo = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    thumb: 'https://example.com/thumb.jpg',
    isAdmin: true,
    isRestricted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('PIN Generation', () => {
    it('should generate PIN on mount', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalledTimes(1);
      });
    });

    it('should display loading state while generating PIN', () => {
      vi.mocked(authManager.generatePin).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithRouter(<AuthenticationPage />);

      expect(screen.getByText('Generating PIN...')).toBeInTheDocument();
    });

    it('should display PIN after successful generation', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
        expect(screen.getByText('D')).toBeInTheDocument();
      });
    });

    it('should display error message on PIN generation failure', async () => {
      const errorMessage = 'Network error';
      vi.mocked(authManager.generatePin).mockRejectedValue(
        new Error(errorMessage)
      );

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should show Try Again button on error', async () => {
      vi.mocked(authManager.generatePin).mockRejectedValue(
        new Error('Network error')
      );

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });
    });
  });

  describe('PIN Polling', () => {
    it('should start polling after PIN is generated', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);
      vi.mocked(authManager.pollPinStatus).mockResolvedValue(null);

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalled();
      });

      // Wait for polling to start
      await waitFor(() => {
        expect(authManager.pollPinStatus).toHaveBeenCalledWith(
          mockPin.id,
          mockPin.code
        );
      }, { timeout: 5000 });
    });

    it('should display waiting message while polling', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);
      vi.mocked(authManager.pollPinStatus).mockResolvedValue(null);

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(screen.getByText('Waiting for authentication...')).toBeInTheDocument();
      });
    });

    it('should stop polling when PIN expires', async () => {
      const expiredPin: PinResponse = {
        ...mockPin,
        expiresAt: new Date(Date.now() - 1000).toISOString(), // Already expired
      };

      vi.mocked(authManager.generatePin).mockResolvedValue(expiredPin);
      vi.mocked(authManager.pollPinStatus).mockResolvedValue(null);

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalled();
      });

      // Wait a bit to ensure polling doesn't start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Should not poll expired PIN
      expect(authManager.pollPinStatus).not.toHaveBeenCalled();
    });
  });

  describe('Successful Authentication', () => {
    it('should handle successful authentication flow', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);
      vi.mocked(authManager.pollPinStatus).mockResolvedValue(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockUserInfo);
      vi.mocked(authManager.storeToken).mockResolvedValue();

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalled();
      });

      // Wait for authentication to complete
      await waitFor(() => {
        expect(authManager.getUserInfo).toHaveBeenCalledWith(mockAuthToken.token);
      }, { timeout: 5000 });

      await waitFor(() => {
        expect(authManager.storeToken).toHaveBeenCalledWith(
          mockUserInfo.id,
          mockAuthToken.token
        );
      });

      await waitFor(() => {
        expect(mockSetAuthentication).toHaveBeenCalledWith(
          mockUserInfo,
          mockAuthToken.token
        );
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/servers');
      });
    });

    it('should stop polling after successful authentication', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);
      vi.mocked(authManager.pollPinStatus).mockResolvedValueOnce(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockUserInfo);
      vi.mocked(authManager.storeToken).mockResolvedValue();

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalled();
      });

      // Wait for authentication
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/servers');
      }, { timeout: 5000 });

      // Poll should have been called once
      expect(authManager.pollPinStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle getUserInfo failure after authentication', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);
      vi.mocked(authManager.pollPinStatus).mockResolvedValue(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockRejectedValue(
        new Error('Failed to get user info')
      );

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText(/Authentication succeeded but failed to retrieve user information/)).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('PIN Refresh', () => {
    it('should allow refreshing PIN when expired', async () => {
      const expiredPin: PinResponse = {
        ...mockPin,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };

      vi.mocked(authManager.generatePin)
        .mockResolvedValueOnce(expiredPin)
        .mockResolvedValueOnce(mockPin);

      const user = userEvent.setup({ delay: null });
      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(screen.getByText('Refresh PIN')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Refresh PIN'));

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalledTimes(2);
      });
    });

    it('should allow retrying after error', async () => {
      vi.mocked(authManager.generatePin)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPin);
      vi.mocked(authManager.pollPinStatus).mockResolvedValue(null);

      const user = userEvent.setup({ delay: null });
      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(screen.getByText('Try Again')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Try Again'));

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument();
      });
    });
  });

  describe('UI Elements', () => {
    it('should display page title and description', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);

      renderWithRouter(<AuthenticationPage />);

      expect(screen.getByText('Sign in to Plex')).toBeInTheDocument();
      expect(
        screen.getByText('Connect your Plex account to manage your media libraries')
      ).toBeInTheDocument();
    });

    it('should display link to Plex sign-up', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);

      renderWithRouter(<AuthenticationPage />);

      const signUpLink = screen.getByText('Create one here');
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', 'https://www.plex.tv/sign-up/');
      expect(signUpLink).toHaveAttribute('target', '_blank');
    });

    it('should display PinDisplay component', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(screen.getByText('Authenticate with Plex')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should continue polling on individual poll errors', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);
      vi.mocked(authManager.pollPinStatus)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(null);

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalled();
      });

      // Wait for multiple polls
      await waitFor(() => {
        expect(authManager.pollPinStatus).toHaveBeenCalledTimes(2);
      }, { timeout: 6000 });
    });

    it('should handle storeToken failure gracefully', async () => {
      vi.mocked(authManager.generatePin).mockResolvedValue(mockPin);
      vi.mocked(authManager.pollPinStatus).mockResolvedValue(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockUserInfo);
      vi.mocked(authManager.storeToken).mockRejectedValue(
        new Error('Storage error')
      );

      renderWithRouter(<AuthenticationPage />);

      await waitFor(() => {
        expect(authManager.generatePin).toHaveBeenCalled();
      });

      // Should still attempt to store token even if it fails
      await waitFor(() => {
        expect(authManager.storeToken).toHaveBeenCalled();
      }, { timeout: 5000 });
    });
  });
});
