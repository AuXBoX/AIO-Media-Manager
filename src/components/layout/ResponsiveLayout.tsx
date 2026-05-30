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
 * Main responsive layout component - Modern Plex Pro aesthetic
 * - Mobile: Hamburger menu with slide-in sidebar
 * - Tablet/Desktop: Collapsible sidebar
 * 
 * Layout Structure:
 * ┌─────────────────────────────────────────────────┐
 * │ Header (64px, sticky, glass effect)            │
 * ├──────────┬──────────────────────┬───────────────┤
 * │          │                      │               │
 * │ Sidebar  │   Main Content       │ Detail Panel  │
 * │ (240px)  │   (flexible)         │ (420px)       │
 * │ White    │   Light gray bg      │ Dark floating │
 * │          │   (#F8FAFC)          │               │
 * │          │                      │               │
 * └──────────┴──────────────────────┴───────────────┘
 * 
 * Z-Index Layers:
 * - Base content: 1
 * - Sidebar: 10
 * - Header: 40
 * - Dropdowns: 50
 * - Modal backdrop: 100
 * - Modal: 110
 * - Toast: 120
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
    <div 
      className="h-full flex flex-col min-h-0 animate-fade-in" 
      style={{ 
        background: 'var(--color-bg-primary)', // #F8FAFC - Light gray-blue background
      }}
    >
      {/* Header with glass effect - Sticky at top with proper z-index (40) */}
      {header && (
        <header 
          className="sticky top-0 glass shadow-soft"
          style={{ 
            height: 'var(--header-height)', // 64px
            borderBottom: '1px solid var(--color-border)',
            zIndex: 'var(--z-header)', // z-index: 40
          }}
        >
          {header}
        </header>
      )}

      {/* Main content area - Flex layout with proper spacing */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Mobile navigation - Overlay with high z-index */}
        {isMobile && (
          <MobileNav isOpen={mobileNav.isOpen} onToggle={mobileNav.toggle}>
            {sidebar}
          </MobileNav>
        )}

        {/* Desktop sidebar - Always visible, fixed width (240px) with proper z-index (10) */}
        {!isMobile && (
          <div 
            style={{ 
              width: 'var(--sidebar-width)', 
              flexShrink: 0,
              height: '100%',
              overflow: 'hidden'
            }}
          >
            <ResponsiveSidebar isOpen={true} onToggle={toggleSidebar}>
              {sidebar}
            </ResponsiveSidebar>
          </div>
        )}

        {/* Main content - Flexible width with proper background (#F8FAFC) and z-index (1) */}
        <main 
          className="flex-1 min-h-0 overflow-hidden flex flex-col"
          style={{
            background: 'var(--color-bg-primary)', // #F8FAFC - Light gray-blue background
            position: 'relative',
            zIndex: 'var(--z-base)', // z-index: 1
          }}
        >
          {children}
        </main>
      </div>

      {/* Footer - Optional with proper border and z-index */}
      {footer && (
        <footer 
          className="bg-white" 
          style={{ 
            borderTop: '1px solid var(--color-border)',
            zIndex: 'var(--z-sidebar)', // z-index: 10
          }}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}

/**
 * Responsive header component
 * Provides consistent header styling with proper spacing (24px padding)
 * Background: #F8FAFC (light gray-blue)
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
    <div 
      style={{
        background: 'var(--color-bg-primary)', // #F8FAFC - Light gray-blue background
        padding: '24px', // 24px padding as per spec
      }}
    >
      {breadcrumbs && (
        <div 
          className="mb-2 text-sm" 
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {breadcrumbs}
        </div>
      )}
      
      <div className="flex items-center justify-between gap-4">
        <h1 
          className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}
          style={{ 
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
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
 * Provides consistent padding (24px) and spacing for content sections
 * Background: #F8FAFC (light gray-blue)
 */
interface ResponsiveContentProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function ResponsiveContent({
  children,
  className = '',
  noPadding = false,
}: ResponsiveContentProps) {
  return (
    <div 
      className={className}
      style={{
        background: 'var(--color-bg-primary)', // #F8FAFC - Light gray-blue background
        padding: noPadding ? undefined : '24px', // 24px padding as per spec
      }}
    >
      {children}
    </div>
  );
}
