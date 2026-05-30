import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserSwitcher } from './UserSwitcher';
import { authManager } from '@/managers/AuthenticationManager';
import type { HomeUser, AuthToken } from '@/managers/AuthenticationManager';
import type { UserInfo } from '@/types';

// Mock the auth manager
vi.mock('@/managers/AuthenticationManager', () => ({
  authManager: {
    getHomeUsers: vi.fn(),
    switchUser: vi.fn(),
    getUserInfo: vi.fn(),
    storeToken: vi.fn(),
  },
}));

// Mock the app store
const mockSetAuthentication = vi.fn();
const mockCurrentUser = {
  id: 'user-1',
  username: 'admin',
  email: 'admin@example.com',
  thumb: 'https://example.com/admin.jpg',
  isAdmin: true,
  isRestricted: false,
};

vi.mock('@/store/appStore', () => ({
  useAppStore: (selector: any) => {
    const store = {
      currentUser: mockCurrentUser,
      setAuthentication: mockSetAuthentication,
    };
    return selector ? selector(store) : store;
  },
}));

describe('UserSwitcher', () => {
  const mockAdminToken = 'admin-token';
  
  const mockUsers: HomeUser[] = [
    {
      id: 'user-1',
      title: 'Admin User',
      username: 'admin',
      thumb: 'https://example.com/admin.jpg',
      admin: true,
      restricted: false,
      guest: false,
    },
    {
      id: 'user-2',
      title: 'Regular User',
      username: 'user',
      thumb: 'https://example.com/user.jpg',
      admin: false,
      restricted: false,
      guest: false,
    },
    {
      id: 'user-3',
      title: 'Restricted User',
      thumb: '',
      admin: false,
      restricted: true,
      guest: false,
    },
  ];

  const mockAuthToken: AuthToken = {
    token: 'new-user-token',
  };

  const mockUserInfo: UserInfo = {
    id: 'user-2',
    username: 'user',
    email: 'user@example.com',
    thumb: 'https://example.com/user.jpg',
    isAdmin: false,
    isRestricted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading state while fetching users', () => {
      vi.mocked(authManager.getHomeUsers).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<UserSwitcher adminToken={mockAdminToken} />);

      expect(screen.getByText('Loading users...')).toBeInTheDocument();
    });

    it('should call getHomeUsers with admin token', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(authManager.getHomeUsers).toHaveBeenCalledWith(mockAdminToken);
      });
    });
  });

  describe('User List Display', () => {
    it('should display all home users', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('Regular User')).toBeInTheDocument();
        expect(screen.getByText('Restricted User')).toBeInTheDocument();
      });
    });

    it('should display user avatars', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThan(0);
      });
    });

    it('should display fallback avatar for users without thumb', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        // User 3 has no thumb, should show first letter
        expect(screen.getByText('R')).toBeInTheDocument(); // "R" from "Restricted User"
      });
    });

    it('should display admin badge for admin users', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Admin')).toBeInTheDocument();
      });
    });

    it('should display restricted badge for restricted users', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Restricted')).toBeInTheDocument();
      });
    });

    it('should display usernames when available', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('@admin')).toBeInTheDocument();
        expect(screen.getByText('@user')).toBeInTheDocument();
      });
    });

    it('should mark current user with checkmark', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        const adminButton = screen.getByText('Admin User').closest('button');
        expect(adminButton).toHaveClass('bg-primary-50');
      });
    });
  });

  describe('User Switching', () => {
    it('should handle user switch', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);
      vi.mocked(authManager.switchUser).mockResolvedValue(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockUserInfo);
      vi.mocked(authManager.storeToken).mockResolvedValue();

      const user = userEvent.setup();
      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Regular User'));

      await waitFor(() => {
        expect(authManager.switchUser).toHaveBeenCalledWith(
          mockAdminToken,
          'user-2'
        );
      });
    });

    it('should get user info after switching', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);
      vi.mocked(authManager.switchUser).mockResolvedValue(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockUserInfo);
      vi.mocked(authManager.storeToken).mockResolvedValue();

      const user = userEvent.setup();
      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Regular User'));

      await waitFor(() => {
        expect(authManager.getUserInfo).toHaveBeenCalledWith(mockAuthToken.token);
      });
    });

    it('should store new token', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);
      vi.mocked(authManager.switchUser).mockResolvedValue(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockUserInfo);
      vi.mocked(authManager.storeToken).mockResolvedValue();

      const user = userEvent.setup();
      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Regular User'));

      await waitFor(() => {
        expect(authManager.storeToken).toHaveBeenCalledWith(
          mockUserInfo.id,
          mockAuthToken.token
        );
      });
    });

    it('should update app state after switching', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);
      vi.mocked(authManager.switchUser).mockResolvedValue(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockUserInfo);
      vi.mocked(authManager.storeToken).mockResolvedValue();

      const user = userEvent.setup();
      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Regular User'));

      await waitFor(() => {
        expect(mockSetAuthentication).toHaveBeenCalledWith(
          mockUserInfo,
          mockAuthToken.token
        );
      });
    });

    it('should call onUserSwitch callback', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);
      vi.mocked(authManager.switchUser).mockResolvedValue(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockResolvedValue(mockUserInfo);
      vi.mocked(authManager.storeToken).mockResolvedValue();

      const onUserSwitch = vi.fn();
      const user = userEvent.setup();
      
      render(
        <UserSwitcher
          adminToken={mockAdminToken}
          onUserSwitch={onUserSwitch}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Regular User'));

      await waitFor(() => {
        expect(onUserSwitch).toHaveBeenCalledWith(
          mockUsers[1],
          mockAuthToken.token
        );
      });
    });

    it('should show loading state while switching', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);
      vi.mocked(authManager.switchUser).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const user = userEvent.setup();
      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Regular User'));

      await waitFor(() => {
        const regularUserButton = screen.getByText('Regular User').closest('button');
        expect(regularUserButton).toHaveClass('opacity-50');
      });
    });

    it('should not allow switching to current user', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      const user = userEvent.setup();
      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Admin User')).toBeInTheDocument();
      });

      const adminButton = screen.getByText('Admin User').closest('button');
      await user.click(adminButton!);

      // Should not call switchUser for current user
      expect(authManager.switchUser).not.toHaveBeenCalled();
    });

    it('should disable other users while switching', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);
      vi.mocked(authManager.switchUser).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const user = userEvent.setup();
      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Regular User'));

      await waitFor(() => {
        const restrictedButton = screen.getByText('Restricted User').closest('button');
        expect(restrictedButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when loading users fails', async () => {
      const errorMessage = 'Network error';
      vi.mocked(authManager.getHomeUsers).mockRejectedValue(
        new Error(errorMessage)
      );

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display error when switching fails', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);
      vi.mocked(authManager.switchUser).mockRejectedValue(
        new Error('Switch failed')
      );

      const user = userEvent.setup();
      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Regular User'));

      await waitFor(() => {
        expect(screen.getByText('Switch failed')).toBeInTheDocument();
      });
    });

    it('should handle getUserInfo failure', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);
      vi.mocked(authManager.switchUser).mockResolvedValue(mockAuthToken);
      vi.mocked(authManager.getUserInfo).mockRejectedValue(
        new Error('Failed to get user info')
      );

      const user = userEvent.setup();
      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Regular User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Regular User'));

      await waitFor(() => {
        expect(screen.getByText('Failed to get user info')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should render nothing when no users available', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue([]);

      const { container } = render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(authManager.getHomeUsers).toHaveBeenCalled();
      });

      expect(container.firstChild).toBeNull();
    });
  });

  describe('UI Elements', () => {
    it('should display component title', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Switch User')).toBeInTheDocument();
      });
    });

    it('should display component description', async () => {
      vi.mocked(authManager.getHomeUsers).mockResolvedValue(mockUsers);

      render(<UserSwitcher adminToken={mockAdminToken} />);

      await waitFor(() => {
        expect(screen.getByText('Select a Plex Home user')).toBeInTheDocument();
      });
    });
  });
});
