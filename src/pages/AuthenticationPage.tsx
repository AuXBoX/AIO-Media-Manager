import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { PinDisplay } from '@/components/auth/PinDisplay';
import { authManager } from '@/managers/AuthenticationManager';
import type { PinResponse } from '@/managers/AuthenticationManager';
import { useAppStore } from '@/store/appStore';

/**
 * AuthenticationPage Component
 * 
 * Orchestrates the complete PIN-based OAuth authentication flow:
 * 1. Generates a PIN on mount
 * 2. Displays the PIN using PinDisplay component
 * 3. Automatically polls PIN status every 2-3 seconds
 * 4. Stores authentication token and user info on success
 * 5. Navigates to server selection page after authentication
 * 6. Handles errors with retry options
 */
export function AuthenticationPage() {
  const navigate = useNavigate();
  const setAuthentication = useAppStore((state) => state.setAuthentication);

  const [pin, setPin] = useState<PinResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  /**
   * Open Plex auth URL in browser
   */
  const openAuthUrl = useCallback(() => {
    if (!pin) return;
    
    const authUrl = `https://app.plex.tv/auth#?clientID=${encodeURIComponent(
      'aio-media-manager'
    )}&code=${encodeURIComponent(pin.code)}&context[device][product]=${encodeURIComponent(
      'AIO Media Manager'
    )}`;
    
    window.open(authUrl, '_blank');
  }, [pin]);

  /**
   * Generate a new PIN for authentication
   */
  const generateNewPin = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPin(null);

    try {
      const newPin = await authManager.generatePin();
      setPin(newPin);
      setPolling(true);
    } catch (err) {
      console.error('Failed to generate PIN:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate PIN. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Poll PIN status to check if user has authenticated
   */
  const pollPinStatus = useCallback(async () => {
    if (!pin || !polling) return;

    try {
      console.log('Polling PIN status...', { pinId: pin.id, code: pin.code });
      const authToken = await authManager.pollPinStatus(pin.id, pin.code);

      if (authToken) {
        console.log('Authentication successful! Token received');
        // Authentication successful - get user info
        setPolling(false);
        
        try {
          console.log('Fetching user info...');
          const userInfo = await authManager.getUserInfo(authToken.token);
          console.log('User info received:', userInfo);
          
          // Store token
          await authManager.storeToken(userInfo.id, authToken.token);
          console.log('Token stored');
          
          // Update app state
          setAuthentication(userInfo, authToken.token);
          console.log('App state updated, navigating to servers...');
          
          // Navigate to server selection
          navigate('/servers');
        } catch (err) {
          console.error('Failed to get user info:', err);
          setError(
            'Authentication succeeded but failed to retrieve user information. Please try again.'
          );
          setPolling(false);
        }
      } else {
        console.log('PIN not claimed yet, continuing to poll...');
      }
    } catch (err) {
      console.error('Error polling PIN status:', err);
      // Don't stop polling on individual poll errors - the PIN might just not be claimed yet
      // Only stop if we get a specific error indicating the PIN is invalid/expired
    }
  }, [pin, polling, setAuthentication, navigate]);

  /**
   * Check if PIN has expired
   */
  const isPinExpired = useCallback(() => {
    if (!pin) return false;
    return new Date(pin.expiresAt).getTime() < Date.now();
  }, [pin]);

  /**
   * Handle PIN refresh when expired
   */
  const handleRefresh = useCallback(() => {
    setPolling(false);
    generateNewPin();
  }, [generateNewPin]);

  /**
   * Generate PIN on component mount
   */
  useEffect(() => {
    generateNewPin();
  }, [generateNewPin]);

  /**
   * Set up polling interval when PIN is available
   */
  useEffect(() => {
    if (!polling || !pin) return;

    // Check if PIN is expired
    if (isPinExpired()) {
      setPolling(false);
      return;
    }

    // Poll every 2 seconds
    const pollInterval = setInterval(() => {
      if (isPinExpired()) {
        setPolling(false);
        clearInterval(pollInterval);
        return;
      }
      pollPinStatus();
    }, 2000);

    // Initial poll
    pollPinStatus();

    return () => clearInterval(pollInterval);
  }, [polling, pin, pollPinStatus, isPinExpired]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sign in to Plex
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect your Plex account to manage your media libraries
          </p>
        </div>

        {/* PIN Display */}
        <PinDisplay
          pin={pin}
          loading={loading}
          error={error}
          onRefresh={handleRefresh}
        />

        {/* Auth Button */}
        {pin && !loading && !error && (
          <div className="mt-6 text-center">
            <Button
              onClick={openAuthUrl}
              variant="primary"
              size="large"
            >
              Open Plex Authentication
            </Button>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Click the button above to authenticate with Plex
            </p>
          </div>
        )}

        {/* Status Message */}
        {polling && pin && !isPinExpired() && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-2 text-primary-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="text-sm font-medium">
                Waiting for authentication...
              </span>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Don't have a Plex account?{' '}
            <a
              href="https://www.plex.tv/sign-up/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Create one here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthenticationPage;
