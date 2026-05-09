/**
 * SkipLink Component
 * 
 * Provides a skip navigation link for keyboard users to bypass
 * repetitive navigation and jump directly to main content.
 * 
 * The link is visually hidden until focused, making it accessible
 * to keyboard users while not cluttering the visual interface.
 */

export interface SkipLinkProps {
  /**
   * ID of the target element to skip to
   */
  targetId: string;

  /**
   * Text to display in the skip link
   */
  children?: string;
}

export function SkipLink({ targetId, children = 'Skip to main content' }: SkipLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      // scrollIntoView may not be available in all environments (e.g., jsdom)
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
    >
      {children}
    </a>
  );
}

/**
 * SkipLinks Component
 * 
 * Container for multiple skip links
 */
export interface SkipLinksProps {
  links: Array<{
    targetId: string;
    label: string;
  }>;
}

export function SkipLinks({ links }: SkipLinksProps) {
  return (
    <nav aria-label="Skip navigation">
      {links.map((link) => (
        <SkipLink key={link.targetId} targetId={link.targetId}>
          {link.label}
        </SkipLink>
      ))}
    </nav>
  );
}
