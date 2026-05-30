import { InputHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * Label text displayed above the input
   */
  label?: string;
  /**
   * Hint text displayed below the input
   */
  hint?: string;
  /**
   * Error message - when provided, input shows error state
   */
  error?: string;
  /**
   * Icon to display on the left side of the input
   */
  leftIcon?: ReactNode;
  /**
   * Icon to display on the right side of the input
   */
  rightIcon?: ReactNode;
  /**
   * Additional class name for the container div
   */
  containerClassName?: string;
  /**
   * Additional class name for the label
   */
  labelClassName?: string;
}

/**
 * Input Component
 * 
 * Modern input component with label, hint text, error states, and icon support.
 * Follows the Plex Pro design system with clean borders and focus rings.
 * 
 * @example
 * ```tsx
 * // Basic input with label
 * <Input label="Title" placeholder="Enter title..." />
 * 
 * // With hint text
 * <Input 
 *   label="Email" 
 *   hint="We'll never share your email"
 *   type="email"
 * />
 * 
 * // With error state
 * <Input 
 *   label="Username" 
 *   error="Username is required"
 *   value={username}
 * />
 * 
 * // With left icon
 * <Input 
 *   label="Search" 
 *   leftIcon={<SearchIcon />}
 *   placeholder="Search..."
 * />
 * 
 * // With right icon
 * <Input 
 *   label="Password" 
 *   type="password"
 *   rightIcon={<EyeIcon />}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      leftIcon,
      rightIcon,
      containerClassName,
      labelClassName,
      className,
      disabled,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const hasError = !!error;
    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon;

    return (
      <div className={clsx('w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={id}
            className={clsx(
              'block mb-2 text-sm font-medium text-text-primary',
              {
                'text-error-600': hasError,
                'opacity-50': disabled,
              },
              labelClassName
            )}
          >
            {label}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {hasLeftIcon && (
            <div
              className={clsx(
                'absolute left-4 top-1/2 -translate-y-1/2',
                'flex items-center justify-center',
                'h-4 w-4 text-text-tertiary pointer-events-none',
                {
                  'text-error-500': hasError,
                  'opacity-50': disabled,
                }
              )}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={clsx(
              // Base styles
              'w-full px-4 py-2.5 text-sm',
              'bg-white text-text-primary',
              'border rounded-lg',
              'transition-all duration-150',
              'placeholder:text-text-tertiary',
              
              // Focus styles
              'focus:outline-none',
              'focus:ring-3',
              
              // Normal state
              {
                'border-border': !hasError && !disabled,
                'focus:border-primary-500 focus:ring-primary-subtle': !hasError && !disabled,
              },
              
              // Error state
              {
                'border-error-500': hasError && !disabled,
                'focus:border-error-600 focus:ring-error-500/10': hasError && !disabled,
              },
              
              // Disabled state
              {
                'opacity-50 cursor-not-allowed bg-secondary-50': disabled,
              },
              
              // Icon padding adjustments
              {
                'pl-11': hasLeftIcon,
                'pr-11': hasRightIcon,
              },
              
              className
            )}
            {...props}
          />

          {/* Right Icon */}
          {hasRightIcon && (
            <div
              className={clsx(
                'absolute right-4 top-1/2 -translate-y-1/2',
                'flex items-center justify-center',
                'h-4 w-4 text-text-tertiary pointer-events-none',
                {
                  'text-error-500': hasError,
                  'opacity-50': disabled,
                }
              )}
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>

        {/* Hint or Error Message */}
        {(hint || error) && (
          <p
            className={clsx('mt-1.5 text-xs', {
              'text-text-tertiary': !hasError,
              'text-error-600': hasError,
            })}
            role={hasError ? 'alert' : undefined}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
