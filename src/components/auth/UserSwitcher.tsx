import { useState, useEffect } from 'react';
import { authManager } from '@/managers/AuthenticationManager';
import type { HomeUser } from '@/managers/AuthenticationManager';
import { useAppStore } from '@/store/appStore';

export interface UserSwitcherProps {
  adminToken: string;
  onUserSwitch?: (user: HomeUser, token: string) => void;
}

/**
 * UserSwitcher Component
 * 
 * Displays Plex Home users and allows switching between them.
 * Only available for admin users with Plex Home.
 */
export function UserSwitcher({ adminToken, onUserSwitch }: UserSwitcherProps) {
  const { currentUser, setAuthentication } = useAppStore();
  const [users, setUsers] = useState<HomeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null);

  /**
   * Load Plex Home users on mount
   */
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const homeUsers = await authManager.getHomeUsers(adminToken);
        setUsers(homeUsers);
      } catch (err) {
        console.error('Failed to load home users:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load users. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [adminToken]);

  /**
   * Handle user switch
   */
  const handleUserSwitch = async (user: HomeUser) => {
    if (switching || user.id === currentUser?.id) return;

    setSwitching(user.id);
    setError(null);

    try {
      // Switch to the selected user
      const authToken = await authManager.switchUser(adminToken, user.id);
      
      // Get user info with the new token
      const userInfo = await authManager.getUserInfo(authToken.token);
      
      // Store the new token
      await authManager.storeToken(userInfo.id, authToken.token);
      
      // Update app state
      setAuthentication(userInfo, authToken.token);
      
      // Call callback if provided
      if (onUserSwitch) {
        onUserSwitch(user, authToken.token);
      }
    } catch (err) {
      console.error('Failed to switch user:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to switch user. Please try again.'
      );
    } finally {
      setSwitching(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-300">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  if (users.length === 0) {
    return null; // No users to switch to
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Switch User
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Select a Plex Home user
        </p>
      </div>

      <div className="p-2">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUser?.id;
          const isSwitching = switching === user.id;

          return (
            <button
              key={user.id}
              onClick={() => handleUserSwitch(user)}
              disabled={isCurrentUser || isSwitching || switching !== null}
              className={`
                w-full flex items-center gap-3 p-3 rounded-lg transition-colors
                ${isCurrentUser 
                  ? 'bg-blue-50 dark:bg-blue-900/20 cursor-default' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                }
                ${isSwitching ? 'opacity-50' : ''}
                disabled:cursor-not-allowed
              `}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.thumb ? (
                  <img
                    src={user.thumb}
                    alt={user.title}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-300 text-lg font-medium">
                      {user.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.title}
                  </span>
                  {user.admin && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                      Admin
                    </span>
                  )}
                  {user.restricted && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
                      Restricted
                    </span>
                  )}
                </div>
                {user.username && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{user.username}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="flex-shrink-0">
                {isCurrentUser && (
                  <div className="flex items-center text-blue-600 dark:text-blue-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {isSwitching && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 dark:border-blue-400"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
