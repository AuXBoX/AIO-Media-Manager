import { useState, useEffect } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// Simple icon components
const XIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

interface MobileNavProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/**
 * Mobile navigation component with hamburger menu
 * Displays a slide-in sidebar on mobile devices
 */
export function MobileNav({ isOpen, onToggle, children }: MobileNavProps) {
  const { isMobile } = useBreakpoint();

  // Close menu when switching to desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      onToggle();
    }
  }, [isMobile, isOpen, onToggle]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isMobile]);

  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-secondary-800 rounded-lg shadow-medium hover:shadow-hard transition-all"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? (
          <XIcon />
        ) : (
          <MenuIcon />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white dark:bg-secondary-800 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          shadow-hard overflow-y-auto
        `}
      >
        <div className="pt-16 pb-6 px-4">
          {children}
        </div>
      </aside>
    </>
  );
}

/**
 * Hook to manage mobile navigation state
 */
export function useMobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen((prev) => !prev);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return {
    isOpen,
    toggle,
    open,
    close,
  };
}
