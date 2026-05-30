import { useBreakpoint } from '@/hooks/useBreakpoint';
import { 
  Sidebar, 
  SidebarItem as SidebarItemBase, 
  SidebarSection as SidebarSectionBase 
} from '@/components/layout/Sidebar';

interface ResponsiveSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive sidebar component - Modern Plex Pro aesthetic
 * - Desktop: Fixed sidebar (always visible)
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
    <Sidebar
      isCollapsed={false}
      className={`relative h-full ${className}`}
    >
      {children}
    </Sidebar>
  );
}

// Re-export for backward compatibility
export { SidebarItemBase as SidebarItem, SidebarSectionBase as SidebarSection };
