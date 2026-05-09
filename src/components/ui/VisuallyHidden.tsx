import { ReactNode } from 'react';

/**
 * VisuallyHidden Component
 * 
 * Hides content visually while keeping it accessible to screen readers.
 * Useful for providing additional context to assistive technologies
 * without cluttering the visual interface.
 * 
 * @example
 * ```tsx
 * <button>
 *   <Icon name="close" />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 * ```
 */

export interface VisuallyHiddenProps {
  /**
   * Content to hide visually
   */
  children: ReactNode;

  /**
   * HTML element to render
   */
  as?: keyof JSX.IntrinsicElements;
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>;
}
