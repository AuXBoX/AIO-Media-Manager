import { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import clsx from 'clsx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Label text displayed above the textarea
   */
  label?: string;
  /**
   * Hint text displayed below the textarea
   */
  hint?: string;
  /**
   * Error message - when provided, textarea shows error state
   */
  error?: string;
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
 * Textarea Component
 * 
 * Modern textarea component with label, hint text, and error states.
 * Follows the Plex Pro design system with clean borders and focus rings.
 * 
 * @example
 * ```tsx
 * // Basic textarea with label
 * <Textarea label="Description" placeholder="Enter description..." />
 * 
 * // With hint text
 * <Textarea 
 *   label="Bio" 
 *   hint="Tell us about yourself"
 *   rows={4}
 * />
 * 
 * // With error state
 * <Textarea 
 *   label="Message" 
 *   error="Message is required"
 *   value={message}
 * />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      hint,
      error,
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

        {/* Textarea Field */}
        <textarea
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
            'resize-none',
            
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
            
            className
          )}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
