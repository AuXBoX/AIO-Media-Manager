import { useState } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { MobileNav, useMobileNav } from '@/components/ui/MobileNav';
import { ResponsiveSidebar } from '@/components/ui/ResponsiveSidebar';

interface ResponsiveLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Main responsive layout component
 * - Mobile: Hamburger menu with slide-in sidebar
 * - Tablet/Desktop: Collapsible sidebar
 */
export function ResponsiveLayout({
  sidebar,
  children,
  header,
  footer,
}: ResponsiveLayoutProps) {
  const { isMobile } = useBreakpoint();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const mobileNav = useMobileNav();

  const toggleSidebar = () => {
    if (isMobile) {
      mobileNav.toggle();
    } else {
      setIsSidebarOpen((prev) => !prev);
    }
  };

  return (
    <div className="h-full bg-secondary-50 dark:bg-secondary-900 flex flex-col min-h-0">
      {/* Header */}
      {header && (
        <header className="sticky top-0 z-30 bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 shadow-soft">
          {header}
        </header>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Mobile navigation */}
        {isMobile && (
          <MobileNav isOpen={mobileNav.isOpen} onToggle={mobileNav.toggle}>
            {sidebar}
          </MobileNav>
        )}

        {/* Desktop sidebar */}
        {!isMobile && (
          <ResponsiveSidebar isOpen={isSidebarOpen} onToggle={toggleSidebar}>
            {sidebar}
          </ResponsiveSidebar>
        )}

        {/* Main content */}
        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <footer className="bg-white dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700">
          {footer}
        </footer>
      )}
    </div>
  );
}

/**
 * Responsive header component
 */
interface ResponsiveHeaderProps {
  title: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
}

export function ResponsiveHeader({
  title,
  actions,
  breadcrumbs,
}: ResponsiveHeaderProps) {
  const { isMobile } = useBreakpoint();

  return (
    <div className="px-4 md:px-6 py-4">
      {breadcrumbs && (
        <div className="mb-2 text-sm text-secondary-600 dark:text-secondary-400">
          {breadcrumbs}
        </div>
      )}
      
      <div className="flex items-center justify-between gap-4">
        <h1 className={`font-bold text-secondary-900 dark:text-secondary-50 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
          {title}
        </h1>
        
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Responsive content wrapper
 */
interface ResponsiveContentProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveContent({
  children,
  className = '',
}: ResponsiveContentProps) {
  return (
    <div className={`px-4 md:px-6 py-4 md:py-6 ${className}`}>
      {children}
    </div>
  );
}
