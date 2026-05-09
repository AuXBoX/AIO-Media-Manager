import { useBreakpoint } from '@/hooks/useBreakpoint';

// Simple icon components
const ChevronLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

interface ResponsiveSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive sidebar component
 * - Desktop: Collapsible sidebar with toggle button
 * - Mobile: Hidden (use MobileNav instead)
 */
export function ResponsiveSidebar({
  isOpen,
  onToggle,
  children,
  className = '',
}: ResponsiveSidebarProps) {
  const { isMobile } = useBreakpoint();

  // Don't render on mobile (use MobileNav instead)
  if (isMobile) {
    return null;
  }

  return (
    <aside
      className={`
        relative h-full bg-white dark:bg-secondary-800 border-r border-secondary-200 dark:border-secondary-700
        transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-16'}
        ${className}
      `}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 z-10 p-1 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-full shadow-soft hover:shadow-medium transition-all"
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {isOpen ? (
          <ChevronLeftIcon />
        ) : (
          <ChevronRightIcon />
        )}
      </button>

      {/* Sidebar content */}
      <div className="h-full overflow-y-auto overflow-x-hidden py-6">
        {children}
      </div>
    </aside>
  );
}

/**
 * Sidebar item component
 */
interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}

export function SidebarItem({
  icon,
  label,
  isActive = false,
  isCollapsed = false,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all
        ${isActive
          ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
          : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
        }
        ${isCollapsed ? 'justify-center' : ''}
      `}
      title={isCollapsed ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{label}</span>
      )}
    </button>
  );
}

/**
 * Sidebar section component
 */
interface SidebarSectionProps {
  title?: string;
  isCollapsed?: boolean;
  children: React.ReactNode;
}

export function SidebarSection({
  title,
  isCollapsed = false,
  children,
}: SidebarSectionProps) {
  return (
    <div className="mb-6">
      {title && !isCollapsed && (
        <h3 className="px-4 mb-2 text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}
