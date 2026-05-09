import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { authManager } from '@/managers/AuthenticationManager';

/**
 * Custom hook for authentication operations
 * Provides convenient methods for authentication state management
 */
export function useAuth() {
  const navigate = useNavigate();
  const {
    isAuthenticated,
    currentUser,
    currentToken,
    setAuthentication,
    clearAuthentication,
  } = useAppStore();

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    try {
      // Clear tokens from storage
      await authManager.clearTokens();
      
      // Clear app state
      clearAuthentication();
      
      // Navigate to auth page
      navigate('/auth');
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Still clear state and navigate even if token clearing fails
      clearAuthentication();
      navigate('/auth');
    }
  }, [clearAuthentication, navigate]);

  /**
   * Check if the current token is still valid
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!currentToken) {
      return false;
    }

    try {
      const isValid = await authManager.validateToken(currentToken);
      
      if (!isValid) {
        // Token is invalid, clear authentication
        clearAuthentication();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to validate session:', error);
      return false;
    }
  }, [currentToken, clearAuthentication]);

  /**
   * Refresh user information
   */
  const refreshUserInfo = useCallback(async () => {
    if (!currentToken) {
      throw new Error('No authentication token available');
    }

    try {
      const userInfo = await authManager.getUserInfo(currentToken);
      setAuthentication(userInfo, currentToken);
      return userInfo;
    } catch (error) {
      console.error('Failed to refresh user info:', error);
      throw error;
    }
  }, [currentToken, setAuthentication]);

  /**
   * Check if user is admin
   */
  const isAdmin = currentUser?.isAdmin ?? false;

  /**
   * Check if user is restricted
   */
  const isRestricted = currentUser?.isRestricted ?? false;

  return {
    // State
    isAuthenticated,
    currentUser,
    currentToken,
    isAdmin,
    isRestricted,
    
    // Actions
    signOut,
    validateSession,
    refreshUserInfo,
    setAuthentication,
    clearAuthentication,
  };
}
