import { AppError } from '@/utils/errorHandling';

export type ErrorVariant = 'inline' | 'banner' | 'modal';

export interface ErrorMessageProps {
  error: AppError | string;
  variant?: ErrorVariant;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * ErrorMessage Component
 * 
 * Reusable error display component with different variants
 */
export function ErrorMessage({
  error,
  variant = 'inline',
  onRetry,
  onDismiss,
  className = '',
}: ErrorMessageProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const isRetryable = typeof error === 'string' ? false : error.retryable;

  const icon = (
    <svg
      className="w-5 h-5 text-red-600 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  if (variant === 'inline') {
    return (
      <div className={`flex items-start gap-3 text-sm ${className}`} role="alert">
        {icon}
        <div className="flex-1">
          <p className="text-red-800">{errorMessage}</p>
          {isRetryable && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-red-600 hover:text-red-800 font-medium underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}
        role="alert"
      >
        <div className="flex items-start gap-3">
          {icon}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
            <p className="text-sm text-red-700">{errorMessage}</p>
            {isRetryable && onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 text-red-600 hover:text-red-800 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${className}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-start gap-3 mb-4">
            {icon}
            <h2 className="text-lg font-semibold text-gray-900 flex-1">Error</h2>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          <p className="text-gray-700 mb-6">{errorMessage}</p>

          <div className="flex gap-3 justify-end">
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Close
              </button>
            )}
            {isRetryable && onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
