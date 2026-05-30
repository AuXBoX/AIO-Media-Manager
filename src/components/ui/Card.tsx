import { HTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card content
   */
  children?: React.ReactNode;
  /**
   * Whether to show hover elevation effect
   * @default true
   */
  hoverable?: boolean;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Header content
   */
  children?: React.ReactNode;
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Content area children
   */
  children?: React.ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Footer content
   */
  children?: React.ReactNode;
}

/**
 * Card Component
 * 
 * Floating card component with subtle shadow and hover elevation effects.
 * Follows the Plex Pro design system with clean borders and smooth transitions.
 * 
 * @example
 * ```tsx
 * // Basic card
 * <Card>
 *   <CardHeader>
 *     <h3>Title</h3>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Content goes here</p>
 *   </CardContent>
 * </Card>
 * 
 * // Card with footer
 * <Card>
 *   <CardHeader>
 *     <h3>Metadata</h3>
 *     <button>Edit</button>
 *   </CardHeader>
 *   <CardContent>
 *     <p>Details...</p>
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Save</Button>
 *   </CardFooter>
 * </Card>
 * 
 * // Non-hoverable card
 * <Card hoverable={false}>
 *   <CardContent>Static content</CardContent>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      hoverable = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          // Base styles
          'bg-white',
          'border border-slate-200/50',
          'rounded-xl',
          'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]',
          
          // Transition
          'transition-all duration-200',
          
          // Hover effect
          {
            'hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] hover:border-slate-200/75':
              hoverable,
          },
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader Component
 * 
 * Header section for Card component with bottom border.
 * Typically used for titles and action buttons.
 * 
 * @example
 * ```tsx
 * <CardHeader>
 *   <h3 className="text-lg font-semibold">Title</h3>
 *   <button>Action</button>
 * </CardHeader>
 * ```
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  (
    {
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          // Layout
          'flex items-center justify-between',
          
          // Spacing
          'p-4',
          
          // Border
          'border-b border-slate-200/50',
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * CardContent Component
 * 
 * Main content area for Card component.
 * 
 * @example
 * ```tsx
 * <CardContent>
 *   <p>Your content here</p>
 * </CardContent>
 * ```
 */
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  (
    {
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          // Spacing
          'p-4',
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * CardFooter Component
 * 
 * Footer section for Card component with top border.
 * Typically used for actions or additional information.
 * 
 * @example
 * ```tsx
 * <CardFooter>
 *   <Button variant="primary">Save</Button>
 *   <Button variant="secondary">Cancel</Button>
 * </CardFooter>
 * ```
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  (
    {
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={clsx(
          // Layout
          'flex items-center justify-end gap-2',
          
          // Spacing
          'p-4',
          
          // Border
          'border-t border-slate-200/50',
          
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';
