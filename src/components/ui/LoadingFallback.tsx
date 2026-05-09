import { FC } from 'react';

interface LoadingFallbackProps {
  message?: string;
}

/**
 * Loading fallback component for lazy-loaded routes and components
 */
export const LoadingFallback: FC<LoadingFallbackProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 dark:bg-secondary-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
        <p className="text-secondary-600 dark:text-secondary-300">{message}</p>
      </div>
    </div>
  );
};
