import { ReactNode } from 'react';

/**
 * Sidebar Component - Modern Plex Pro Aesthetic
 * 
 * Features:
 * - White background with subtle shadow
 * - Floating appearance (margin from edges)
 * - Modern monochrome icons (20px)
 * - Active item: soft yellow pill background (#E5A00D with white text)
 * - Hover state: light gray background (#F8FAFC)
 * - Elegant spacing between items (4px gap)
 * - Collapsible support
 * - Smooth transitions (150ms)
 * - Item padding: 12px 16px
 * - Border radius: 8px (for active pill)
 */

// Icon components
const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

interface SidebarProps {
  children: ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

/**
 * Main Sidebar container
 */
export function Sidebar({
  children,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}: SidebarProps) {
  return (
    <aside
      className={`sidebar ${className}`}
      style={{
        width: isCollapsed ? '80px' : 'var(--sidebar-width)',
        transition: 'width 150ms ease',
      }}
    >
      {children}
    </aside>
  );
}

interface SidebarHeaderProps {
  children: ReactNode;
  className?: string;
}

/**
 * Sidebar header section
 */
export function SidebarHeader({ children, className = '' }: SidebarHeaderProps) {
  return <div className={`sidebar-header ${className}`}>{children}</div>;
}

interface SidebarNavProps {
  children: ReactNode;
  className?: string;
}

/**
 * Sidebar navigation container
 */
export function SidebarNav({ children, className = '' }: SidebarNavProps) {
  return <nav className={`sidebar-nav ${className}`}>{children}</nav>;
}

interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
  isCollapsed?: boolean;
  className?: string;
}

/**
 * Sidebar section with optional title
 */
export function SidebarSection({
  title,
  children,
  isCollapsed = false,
  className = '',
}: SidebarSectionProps) {
  return (
    <div className={`sidebar-nav-section ${className}`}>
      {title && !isCollapsed && (
        <div className="sidebar-nav-section-title">{title}</div>
      )}
      {children}
    </div>
  );
}

interface SidebarItemProps {
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Sidebar navigation item with yellow pill active state
 */
export function SidebarItem({
  icon,
  label,
  isActive = false,
  isCollapsed = false,
  onClick,
  className = '',
}: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`sidebar-nav-item ${
        isActive ? 'sidebar-nav-item-active' : ''
      } ${className}`}
      title={isCollapsed ? label : undefined}
      style={{
        justifyContent: isCollapsed ? 'center' : 'flex-start',
      }}
    >
      <span className="sidebar-nav-icon">{icon}</span>
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

interface SidebarFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * Sidebar footer section
 */
export function SidebarFooter({ children, className = '' }: SidebarFooterProps) {
  return <div className={`sidebar-footer ${className}`}>{children}</div>;
}

interface SidebarDividerProps {
  className?: string;
}

/**
 * Sidebar divider
 */
export function SidebarDivider({ className = '' }: SidebarDividerProps) {
  return (
    <div
      className={`${className}`}
      style={{
        height: '1px',
        background: '#E2E8F0',
        margin: '8px 0',
      }}
    />
  );
}

interface SidebarUserProps {
  username?: string;
  email?: string;
  avatar?: string;
  isCollapsed?: boolean;
  className?: string;
}

/**
 * Sidebar user info display
 */
export function SidebarUser({
  username,
  email,
  avatar,
  isCollapsed = false,
  className = '',
}: SidebarUserProps) {
  const displayName = username || email || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  if (isCollapsed) {
    return (
      <div className={`flex justify-center ${className}`} title={displayName}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
          style={{ background: '#E5A00D' }}
        >
          {avatar ? (
            <img src={avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            initial
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2 mb-2 ${className}`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
        style={{ background: '#E5A00D' }}
      >
        {avatar ? (
          <img src={avatar} alt={displayName} className="w-full h-full rounded-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: '#1E293B' }}
        >
          {displayName}
        </p>
        {email && username && (
          <p
            className="text-xs truncate"
            style={{ color: '#94A3B8' }}
          >
            {email}
          </p>
        )}
      </div>
    </div>
  );
}
