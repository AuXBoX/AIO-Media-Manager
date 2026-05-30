import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant
   * - primary: Blue filled button
   * - secondary: Outline button
   * - ghost: Transparent button
   * - icon: Square icon-only button
   */
  variant?: ButtonVariant;
  /**
   * Button size
   * - small: Compact size
   * - medium: Default size
   * - large: Larger size
   */
  size?: ButtonSize;
  /**
   * Loading state - shows spinner and disables interaction
   */
  loading?: boolean;
  /**
   * Icon to display (typically for icon variant or alongside text)
   */
  icon?: React.ReactNode;
  /**
   * Button content
   */
  children?: React.ReactNode;
}

/**
 * Button Component
 * 
 * Modern button component with multiple variants, sizes, and states.
 * Follows the Plex Pro design system with smooth hover animations.
 * 
 * @example
 * ```tsx
 * // Primary button
 * <Button variant="primary">Save Changes</Button>
 * 
 * // Secondary with icon
 * <Button variant="secondary" icon={<RefreshIcon />}>Refresh</Button>
 * 
 * // Loading state
 * <Button variant="primary" loading>Saving...</Button>
 * 
 * // Icon only
 * <Button variant="icon" icon={<SettingsIcon />} aria-label="Settings" />
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      loading = false,
      disabled = false,
      icon,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const isIconOnly = variant === 'icon';

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          // Base styles
          'inline-flex items-center justify-center gap-2',
          'font-medium transition-all duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          
          // Size variants
          {
            // Small
            'px-3 py-1.5 text-sm': size === 'small' && !isIconOnly,
            'h-8 w-8': size === 'small' && isIconOnly,
            
            // Medium (default)
            'px-5 py-2.5 text-sm': size === 'medium' && !isIconOnly,
            'h-10 w-10': size === 'medium' && isIconOnly,
            
            // Large
            'px-6 py-3 text-base': size === 'large' && !isIconOnly,
            'h-12 w-12': size === 'large' && isIconOnly,
          },
          
          // Border radius
          'rounded-lg',
          
          // Variant styles
          {
            // Primary - Solid blue
            'bg-primary-600 text-white shadow-sm': variant === 'primary' && !isDisabled,
            'hover:bg-primary-700 active:bg-primary-800': 
              variant === 'primary' && !isDisabled,
            
            // Secondary - Light gray background with subtle border
            'bg-gray-100 dark:bg-secondary-700 text-gray-700 dark:text-secondary-100 border border-gray-200 dark:border-secondary-600': variant === 'secondary' && !isDisabled,
            'hover:bg-gray-200 dark:hover:bg-secondary-600 hover:border-gray-300 dark:hover:border-secondary-500 active:bg-gray-300 dark:active:bg-secondary-500': 
              variant === 'secondary' && !isDisabled,
            
            // Ghost & Icon - Transparent with hover
            'bg-transparent': (variant === 'ghost' || variant === 'icon') && !isDisabled,
            'text-gray-700 dark:text-secondary-200': variant === 'ghost' && !isDisabled,
            'text-gray-600 dark:text-secondary-300': variant === 'icon' && !isDisabled,
            'hover:bg-gray-100 dark:hover:bg-secondary-700': (variant === 'ghost' || variant === 'icon') && !isDisabled,
          },
          
          // Disabled state
          {
            'opacity-50 cursor-not-allowed': isDisabled,
            'hover:transform-none hover:shadow-none': isDisabled,
          },
          
          className
        )}
        {...props}
      >
        {loading && (
          <Spinner
            size={size === 'small' ? 'xs' : size === 'large' ? 'sm' : 'sm'}
            variant={variant === 'primary' ? 'white' : 'primary'}
          />
        )}
        
        {!loading && icon && (
          <span
            className={clsx('flex items-center justify-center', {
              'h-3 w-3': size === 'small',
              'h-4 w-4': size === 'medium',
              'h-5 w-5': size === 'large',
            })}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        
        {!isIconOnly && children && (
          <span>{children}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
