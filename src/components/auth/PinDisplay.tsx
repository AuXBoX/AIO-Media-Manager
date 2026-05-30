import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { PinResponse } from '@/managers/AuthenticationManager';

export interface PinDisplayProps {
  pin: PinResponse | null;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

/**
 * PinDisplay Component
 * 
 * Displays the PIN code for Plex OAuth authentication.
 * Shows the 4-character PIN in a large, readable format with instructions
 * and expiration time. Includes a refresh button when the PIN expires.
 */
export function PinDisplay({ pin, loading, error, onRefresh }: PinDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!pin?.expiresAt) {
      setTimeRemaining(null);
      setIsExpired(false);
      return;
    }

    const updateTimeRemaining = () => {
      const expiresAt = new Date(pin.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      setTimeRemaining(remaining);
      setIsExpired(remaining === 0);
    };

    // Update immediately
    updateTimeRemaining();

    // Update every second
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [pin?.expiresAt]);

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Generating PIN...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-600 dark:text-red-400 text-center mb-4">{error}</p>
        {onRefresh && (
          <Button onClick={onRefresh} variant="primary">
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (!pin) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <p className="text-gray-600 dark:text-gray-300">No PIN available</p>
        {onRefresh && (
          <Button onClick={onRefresh} variant="primary" className="mt-4">
            Generate PIN
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md mx-auto">
      {/* Instructions */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Authenticate with Plex
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Visit{' '}
          <a
            href="https://app.plex.tv/auth"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
          >
            app.plex.tv/auth
          </a>
          {' '}and enter this PIN:
        </p>
      </div>

      {/* PIN Display */}
      <div className="mb-6">
        <div className="flex items-center justify-center space-x-2 sm:space-x-3">
          {pin.code.split('').map((char, index) => (
            <div
              key={index}
              className={`
                w-14 h-16 sm:w-16 sm:h-20 flex items-center justify-center
                text-3xl sm:text-4xl font-bold rounded-lg
                ${isExpired 
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500' 
                  : 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                }
                transition-colors
              `}
            >
              {char}
            </div>
          ))}
        </div>
      </div>

      {/* Expiration Timer */}
      <div className="text-center mb-6">
        {timeRemaining !== null && (
          <div className={`text-sm ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>
            {isExpired ? (
              <span className="font-medium">PIN Expired</span>
            ) : (
              <>
                Expires in:{' '}
                <span className="font-mono font-medium">
                  {formatTimeRemaining(timeRemaining)}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      {isExpired && onRefresh && (
        <Button onClick={onRefresh} variant="primary">
          Refresh PIN
        </Button>
      )}

      {/* Additional Instructions */}
      {!isExpired && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          <p>After entering the PIN, you'll be redirected back to the app.</p>
        </div>
      )}
    </div>
  );
}
