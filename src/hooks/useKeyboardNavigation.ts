import { useEffect, useCallback, RefObject } from 'react';

export interface KeyboardNavigationOptions {
  /**
   * Enable arrow key navigation
   */
  enableArrowKeys?: boolean;

  /**
   * Enable Enter key activation
   */
  enableEnter?: boolean;

  /**
   * Enable Escape key to close/cancel
   */
  enableEscape?: boolean;

  /**
   * Enable Home/End keys for first/last navigation
   */
  enableHomeEnd?: boolean;

  /**
   * Callback when Enter is pressed
   */
  onEnter?: () => void;

  /**
   * Callback when Escape is pressed
   */
  onEscape?: () => void;

  /**
   * Callback when arrow keys are pressed
   */
  onArrowKey?: (direction: 'up' | 'down' | 'left' | 'right') => void;

  /**
   * Callback when Home key is pressed
   */
  onHome?: () => void;

  /**
   * Callback when End key is pressed
   */
  onEnd?: () => void;
}

/**
 * Hook for managing keyboard navigation
 * 
 * Provides keyboard shortcuts for common navigation patterns:
 * - Arrow keys for directional navigation
 * - Enter for activation
 * - Escape for closing/canceling
 * - Home/End for first/last navigation
 */
export function useKeyboardNavigation(
  ref: RefObject<HTMLElement>,
  options: KeyboardNavigationOptions = {}
): void {
  const {
    enableArrowKeys = true,
    enableEnter = true,
    enableEscape = true,
    enableHomeEnd = true,
    onEnter,
    onEscape,
    onArrowKey,
    onHome,
    onEnd,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Arrow keys
      if (enableArrowKeys && onArrowKey) {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            onArrowKey('up');
            break;
          case 'ArrowDown':
            event.preventDefault();
            onArrowKey('down');
            break;
          case 'ArrowLeft':
            event.preventDefault();
            onArrowKey('left');
            break;
          case 'ArrowRight':
            event.preventDefault();
            onArrowKey('right');
            break;
        }
      }

      // Enter key
      if (enableEnter && event.key === 'Enter' && onEnter) {
        event.preventDefault();
        onEnter();
      }

      // Escape key
      if (enableEscape && event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
      }

      // Home key
      if (enableHomeEnd && event.key === 'Home' && onHome) {
        event.preventDefault();
        onHome();
      }

      // End key
      if (enableHomeEnd && event.key === 'End' && onEnd) {
        event.preventDefault();
        onEnd();
      }
    },
    [
      enableArrowKeys,
      enableEnter,
      enableEscape,
      enableHomeEnd,
      onEnter,
      onEscape,
      onArrowKey,
      onHome,
      onEnd,
    ]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [ref, handleKeyDown]);
}

/**
 * Hook for managing list keyboard navigation
 * 
 * Provides keyboard navigation for lists with arrow keys
 */
export interface ListNavigationOptions {
  /**
   * Total number of items in the list
   */
  itemCount: number;

  /**
   * Currently focused item index
   */
  currentIndex: number;

  /**
   * Callback when index changes
   */
  onIndexChange: (index: number) => void;

  /**
   * Callback when item is activated (Enter/Space)
   */
  onActivate?: (index: number) => void;

  /**
   * Enable wrapping (go to first when at last, and vice versa)
   */
  wrap?: boolean;

  /**
   * Orientation of the list
   */
  orientation?: 'vertical' | 'horizontal';
}

export function useListNavigation(
  ref: RefObject<HTMLElement>,
  options: ListNavigationOptions
): void {
  const {
    itemCount,
    currentIndex,
    onIndexChange,
    onActivate,
    wrap = false,
    orientation = 'vertical',
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const isVertical = orientation === 'vertical';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

      switch (event.key) {
        case nextKey:
          event.preventDefault();
          if (currentIndex < itemCount - 1) {
            onIndexChange(currentIndex + 1);
          } else if (wrap) {
            onIndexChange(0);
          }
          break;

        case prevKey:
          event.preventDefault();
          if (currentIndex > 0) {
            onIndexChange(currentIndex - 1);
          } else if (wrap) {
            onIndexChange(itemCount - 1);
          }
          break;

        case 'Home':
          event.preventDefault();
          onIndexChange(0);
          break;

        case 'End':
          event.preventDefault();
          onIndexChange(itemCount - 1);
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (onActivate) {
            onActivate(currentIndex);
          }
          break;
      }
    },
    [currentIndex, itemCount, onIndexChange, onActivate, wrap, orientation]
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    element.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      element.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [ref, handleKeyDown]);
}
