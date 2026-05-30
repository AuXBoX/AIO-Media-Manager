import { useState } from 'react';
import { Button } from './Button';

export interface RetryButtonProps {
  onRetry: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * RetryButton Component
 * 
 * Button for retrying failed operations with loading state
 */
export function RetryButton({
  onRetry,
  disabled = false,
  className = '',
  children = 'Retry',
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (isRetrying || disabled) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      variant="primary"
      loading={isRetrying}
      className={className}
      icon={!isRetrying ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ) : undefined}
    >
      {isRetrying ? 'Retrying...' : children}
    </Button>
  );
}
