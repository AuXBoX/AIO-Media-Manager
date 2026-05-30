import { FC, HTMLAttributes } from 'react';
import clsx from 'clsx';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'primary' | 'white' | 'secondary';

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /**
   * Size of the spinner
   * - xs: 12px (for inline text)
   * - sm: 16px (for small buttons)
   * - md: 24px (default, for medium buttons)
   * - lg: 32px (for large buttons)
   * - xl: 48px (for page loading)
   */
  size?: SpinnerSize;
  /**
   * Color variant
   * - primary: Blue (#3B82F6)
   * - white: White (for dark backgrounds)
   * - secondary: Gray (#64748B)
   */
  variant?: SpinnerVariant;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Spinner Component
 * 
 * Loading spinner that matches the Plex Pro design system.
 * Uses a circular animation with smooth transitions.
 * 
 * @example
 * ```tsx
 * // Default spinner
 * <Spinner />
 * 
 * // Large primary spinner
 * <Spinner size="xl" variant="primary" />
 * 
 * // Small white spinner for dark backgrounds
 * <Spinner size="sm" variant="white" />
 * 
 * // Inline with text
 * <div className="flex items-center gap-2">
 *   <Spinner size="xs" />
 *   <span>Loading...</span>
 * </div>
 * ```
 */
export const Spinner: FC<SpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className,
  ...props
}) => {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  const variantClasses = {
    primary: 'text-primary-500', // Plex Pro blue
    white: 'text-white',
    secondary: 'text-text-tertiary', // Plex Pro tertiary text
  };

  return (
    <div
      className={clsx(
        'inline-block animate-spin',
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <svg
        className={clsx('h-full w-full', variantClasses[variant])}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

/**
 * SpinnerOverlay Component
 * 
 * Full-screen or container overlay with centered spinner.
 * Useful for blocking interactions during loading.
 * 
 * @example
 * ```tsx
 * // Full screen overlay
 * <SpinnerOverlay />
 * 
 * // Container overlay with message
 * <div className="relative h-64">
 *   <SpinnerOverlay message="Loading data..." />
 * </div>
 * ```
 */
export interface SpinnerOverlayProps {
  /**
   * Loading message to display below spinner
   */
  message?: string;
  /**
   * Spinner size
   */
  size?: SpinnerSize;
  /**
   * Background opacity (0-100)
   */
  opacity?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const SpinnerOverlay: FC<SpinnerOverlayProps> = ({
  message,
  size = 'xl',
  opacity = 75,
  className,
}) => {
  return (
    <div
      className={clsx(
        'absolute inset-0 flex flex-col items-center justify-center',
        'bg-background-primary z-50', // Plex Pro primary background
        className
      )}
      style={{ opacity: opacity / 100 }}
    >
      <Spinner size={size} variant="primary" />
      {message && (
        <p className="mt-4 text-sm text-text-secondary font-medium">{message}</p>
      )}
    </div>
  );
};

/**
 * SpinnerButton Component
 * 
 * Inline spinner for button loading states.
 * Automatically sized to match button text.
 * 
 * @example
 * ```tsx
 * <button disabled>
 *   <SpinnerButton />
 *   <span>Saving...</span>
 * </button>
 * ```
 */
export const SpinnerButton: FC<{ variant?: SpinnerVariant; className?: string }> = ({
  variant = 'white',
  className,
}) => {
  return <Spinner size="sm" variant={variant} className={className} />;
};
