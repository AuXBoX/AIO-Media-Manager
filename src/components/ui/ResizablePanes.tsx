import { useState, useRef, useEffect, ReactNode } from 'react';
import { getSettingsManager } from '@/managers/SettingsManager';

interface ResizablePanesProps {
  leftPane: ReactNode;
  rightPane: ReactNode;
  defaultLeftWidth?: number; // Percentage (0-100)
  minLeftWidth?: number; // Percentage
  minRightWidth?: number; // Percentage
  onResize?: (leftWidth: number) => void;
}

export function ResizablePanes({
  leftPane,
  rightPane,
  defaultLeftWidth = 50,
  minLeftWidth = 20,
  minRightWidth = 20,
  onResize,
}: ResizablePanesProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved width from settings on mount
  useEffect(() => {
    const loadWidth = async () => {
      try {
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getSettings();
        // Store split pane width in gridColumns setting (repurpose for this)
        // Or we could add a new setting, but for now use existing
        const saved = (settings as any).splitPaneWidth;
        if (saved !== undefined) {
          setLeftWidth(saved);
        }
      } catch (error) {
        console.error('Failed to load split pane width:', error);
      }
    };
    loadWidth();
  }, []);

  // Save width to settings when it changes
  useEffect(() => {
    const saveWidth = async () => {
      try {
        const settingsManager = getSettingsManager();
        await settingsManager.updateSettings({ splitPaneWidth: leftWidth } as any);
      } catch (error) {
        console.error('Failed to save split pane width:', error);
      }
    };
    saveWidth();
    onResize?.(leftWidth);
  }, [leftWidth, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      
      // Calculate new left width as percentage
      let newLeftWidth = (mouseX / containerWidth) * 100;
      
      // Apply min/max constraints
      newLeftWidth = Math.max(minLeftWidth, Math.min(100 - minRightWidth, newLeftWidth));
      
      setLeftWidth(newLeftWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, minLeftWidth, minRightWidth]);

  return (
    <div ref={containerRef} className="flex h-full w-full min-h-0">
      {/* Left Pane */}
      <div
        className="flex flex-col min-h-0 h-full overflow-hidden"
        style={{ width: `${leftWidth}%` }}
      >
        {leftPane}
      </div>

      {/* Resizer */}
      <div
        className={`flex-shrink-0 w-1 bg-secondary-200 dark:bg-secondary-700 hover:bg-primary-500 dark:hover:bg-primary-500 cursor-col-resize transition-colors relative group ${
          isDragging ? 'bg-primary-500 dark:bg-primary-500' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        {/* Visual indicator on hover */}
        <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary-500/20 dark:group-hover:bg-primary-500/20" />
      </div>

      {/* Right Pane */}
      <div
        className="flex flex-col min-h-0 h-full overflow-hidden"
        style={{ width: `${100 - leftWidth}%` }}
      >
        {rightPane}
      </div>
    </div>
  );
}
