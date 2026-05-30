import { createContext, useContext, useId, useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

export interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
  registerTab: (value: string) => void;
  unregisterTab: (value: string) => void;
  tabsId: string;
}

export interface TabsProps {
  /**
   * Currently active tab value
   */
  value?: string;
  /**
   * Default active tab value (uncontrolled)
   */
  defaultValue?: string;
  /**
   * Callback when active tab changes
   */
  onChange?: (value: string) => void;
  /**
   * Tab orientation
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Additional class name for the tabs container
   */
  className?: string;
  /**
   * Tab buttons and content
   */
  children: React.ReactNode;
}

export interface TabsListProps {
  /**
   * Additional class name for the tabs list
   */
  className?: string;
  /**
   * Tab buttons
   */
  children: React.ReactNode;
  /**
   * Accessible label for the tab list
   */
  'aria-label'?: string;
}

export interface TabProps {
  /**
   * Unique value for this tab
   */
  value: string;
  /**
   * Tab label/content
   */
  children: React.ReactNode;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Disabled state
   */
  disabled?: boolean;
}

export interface TabPanelProps {
  /**
   * Value matching the associated tab
   */
  value: string;
  /**
   * Panel content
   */
  children: React.ReactNode;
  /**
   * Additional class name
   */
  className?: string;
}

// ============================================================================
// Context
// ============================================================================

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component');
  }
  return context;
}

// ============================================================================
// Tabs Root Component
// ============================================================================

/**
 * Tabs Component
 * 
 * Modern segmented control tabs with smooth transitions and keyboard navigation.
 * Follows the Plex Pro design system with a clean, minimal aesthetic.
 * 
 * Features:
 * - Segmented control style with smooth background transitions
 * - Keyboard navigation (arrow keys, Home, End)
 * - Accessible with proper ARIA attributes
 * - Controlled or uncontrolled mode
 * - Horizontal or vertical orientation
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <Tabs defaultValue="details">
 *   <TabsList aria-label="Media information">
 *     <Tab value="details">Details</Tab>
 *     <Tab value="images">Images</Tab>
 *     <Tab value="files">Files</Tab>
 *   </TabsList>
 *   
 *   <TabPanel value="details">
 *     <p>Details content...</p>
 *   </TabPanel>
 *   <TabPanel value="images">
 *     <p>Images content...</p>
 *   </TabPanel>
 *   <TabPanel value="files">
 *     <p>Files content...</p>
 *   </TabPanel>
 * </Tabs>
 * 
 * // Controlled mode
 * const [activeTab, setActiveTab] = useState('details');
 * <Tabs value={activeTab} onChange={setActiveTab}>
 *   ...
 * </Tabs>
 * ```
 */
export function Tabs({
  value: controlledValue,
  defaultValue,
  onChange,
  orientation = 'horizontal',
  className,
  children,
}: TabsProps) {
  const tabsId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  const [registeredTabs, setRegisteredTabs] = useState<string[]>([]);
  
  const isControlled = controlledValue !== undefined;
  const activeTab = isControlled ? controlledValue : uncontrolledValue;

  const setActiveTab = useCallback((newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onChange?.(newValue);
  }, [isControlled, onChange]);

  const registerTab = useCallback((value: string) => {
    setRegisteredTabs((prev) => {
      if (prev.includes(value)) return prev;
      return [...prev, value];
    });
  }, []);

  const unregisterTab = useCallback((value: string) => {
    setRegisteredTabs((prev) => prev.filter((v) => v !== value));
  }, []);

  // Auto-select first tab if no active tab is set
  useEffect(() => {
    if (!activeTab && registeredTabs.length > 0) {
      setActiveTab(registeredTabs[0]!);
    }
  }, [activeTab, registeredTabs, setActiveTab]);

  const contextValue: TabsContextValue = {
    activeTab,
    setActiveTab,
    orientation,
    registerTab,
    unregisterTab,
    tabsId,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        className={clsx(
          'tabs',
          {
            'flex flex-col flex-1 min-h-0': orientation === 'horizontal',
            'flex flex-row flex-1 min-w-0': orientation === 'vertical',
          },
          className
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// ============================================================================
// TabsList Component
// ============================================================================

/**
 * TabsList - Container for Tab buttons
 * 
 * Renders the segmented control container with the characteristic
 * light blue background and rounded corners.
 */
export function TabsList({
  className,
  children,
  'aria-label': ariaLabel,
}: TabsListProps) {
  const { orientation, tabsId } = useTabsContext();
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const tabs = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])') || []
    );
    
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex((tab) => tab === event.target);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        if (orientation === 'horizontal') {
          event.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal') {
          event.preventDefault();
          nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical') {
          event.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical') {
          event.preventDefault();
          nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        }
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    tabs[nextIndex]?.focus();
    tabs[nextIndex]?.click();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      className={clsx(
        // Segmented control container - adapts to context
        // Light theme: bg-background-secondary (#EEF4FF)
        // Dark theme: bg-white/10 with backdrop blur
        // Container padding: 4px, radius: 12px
        'inline-flex p-1 rounded-xl gap-1',
        // Default light theme styling
        'bg-background-secondary',
        {
          'flex-row': orientation === 'horizontal',
          'flex-col': orientation === 'vertical',
        },
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Tab Component
// ============================================================================

/**
 * Tab - Individual tab button
 * 
 * Renders a single tab button with active state styling.
 */
export function Tab({ value, children, className, disabled = false }: TabProps) {
  const { activeTab, setActiveTab, tabsId, registerTab, unregisterTab } = useTabsContext();
  const isActive = activeTab === value;
  const tabId = `${tabsId}-tab-${value}`;
  const panelId = `${tabsId}-panel-${value}`;

  useEffect(() => {
    registerTab(value);
    return () => unregisterTab(value);
  }, [value, registerTab, unregisterTab]);

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(value);
    }
  };

  return (
    <button
      id={tabId}
      role="tab"
      type="button"
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      className={clsx(
        // Base styles - matches design spec exactly
        // Tab padding: 8px 16px, radius: 8px, font: 14px/500
        'px-4 py-2 text-sm font-medium rounded-lg',
        'transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'whitespace-nowrap',
        
        // Default state - adapts to parent background
        // Light theme: text-text-secondary, Dark theme: text-gray-300
        {
          'bg-transparent': !isActive && !disabled,
          'hover:bg-white/10': !isActive && !disabled,
        },
        
        // Active state - background: white/20 for dark, white for light
        {
          'bg-white/20 text-white shadow-sm': isActive && !disabled,
        },
        
        // Disabled state
        {
          'opacity-50 cursor-not-allowed': disabled,
        },
        
        className
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// TabPanel Component
// ============================================================================

/**
 * TabPanel - Content panel for a tab
 * 
 * Renders the content associated with a tab. Only visible when the tab is active.
 * Includes smooth fade-in transition for better UX.
 */
export function TabPanel({ value, children, className }: TabPanelProps) {
  const { activeTab, tabsId } = useTabsContext();
  const isActive = activeTab === value;
  const tabId = `${tabsId}-tab-${value}`;
  const panelId = `${tabsId}-panel-${value}`;

  if (!isActive) {
    return null;
  }

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      className={clsx(
        'focus:outline-none',
        'animate-fade-in', // Smooth fade-in transition
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

Tabs.List = TabsList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;
