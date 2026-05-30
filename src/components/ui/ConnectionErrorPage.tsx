import { useState, useEffect } from 'react';
import { Button } from './Button';
import { RetryButton } from './RetryButton';

export interface ConnectionErrorPageProps {
  onRetry: () => void | Promise<void>;
  serverName?: string;
  isOffline?: boolean;
}

/**
 * ConnectionErrorPage Component
 * 
 * Full-page error display for connection issues
 */
export function ConnectionErrorPage({
  onRetry,
  serverName,
  isOffline = false,
}: ConnectionErrorPageProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isOffline || !isOnline ? 'No Internet Connection' : 'Cannot Connect to Server'}
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          {isOffline || !isOnline ? (
            <>
              You appear to be offline. Please check your internet connection and try again.
            </>
          ) : (
            <>
              Unable to connect to {serverName ? `"${serverName}"` : 'your Plex server'}.
              {' '}The server may be offline or unreachable.
            </>
          )}
        </p>

        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Internet Connection</span>
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                isOnline ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-600' : 'bg-red-600'
                }`}
              />
              {isOnline ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {serverName && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Plex Server</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Unreachable
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <RetryButton onRetry={onRetry} className="w-full justify-center">
            Try to Reconnect
          </RetryButton>

          {isOffline && (
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              className="w-full justify-center"
            >
              Reload Page
            </Button>
          )}
        </div>

        {/* Troubleshooting Tips */}
        <details className="mt-8 text-left">
          <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
            Troubleshooting Tips
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">•</span>
              <span>Check your internet connection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">•</span>
              <span>Verify that your Plex server is running</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">•</span>
              <span>Ensure you're on the same network as your server (for local connections)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">•</span>
              <span>Check if your firewall is blocking the connection</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">•</span>
              <span>Try accessing your server from the Plex web app</span>
            </li>
          </ul>
        </details>

        {/* Offline Mode Notice */}
        {(isOffline || !isOnline) && (
          <div className="mt-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-left">
                <p className="text-sm font-medium text-primary-900 mb-1">Offline Mode Available</p>
                <p className="text-sm text-primary-700">
                  You can still browse cached content while offline. Changes will sync when you
                  reconnect.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
