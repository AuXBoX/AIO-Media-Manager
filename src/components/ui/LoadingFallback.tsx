import { FC } from 'react';
import { Spinner } from './Spinner';

interface LoadingFallbackProps {
  message?: string;
}

/**
 * Loading fallback component for lazy-loaded routes and components.
 * Uses the updated Spinner component that matches the Plex Pro design system.
 */
export const LoadingFallback: FC<LoadingFallbackProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-primary">
      <Spinner size="lg" label={message} showLabel />
    </div>
  );
};
