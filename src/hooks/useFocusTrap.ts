import { useEffect, useRef, RefObject } from 'react';
import { createFocusTrap, FocusTrapManager } from '@/utils/accessibility';

export interface UseFocusTrapOptions {
  /**
   * Whether the focus trap is active
   */
  active: boolean;

  /**
   * Callback when focus trap is activated
   */
  onActivate?: () => void;

  /**
   * Callback when focus trap is deactivated
   */
  onDeactivate?: () => void;
}

/**
 * Hook for trapping focus within a container (for modals, dialogs)
 * 
 * When active, focus is trapped within the container and Tab/Shift+Tab
 * cycle through focusable elements. When deactivated, focus is restored
 * to the previously focused element.
 * 
 * @example
 * ```tsx
 * function Modal({ isOpen, onClose }) {
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(modalRef, { active: isOpen });
 * 
 *   if (!isOpen) return null;
 * 
 *   return (
 *     <div ref={modalRef} role="dialog" aria-modal="true">
 *       <h2>Modal Title</h2>
 *       <button onClick={onClose}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement>,
  options: UseFocusTrapOptions
): void {
  const { active, onActivate, onDeactivate } = options;
  const focusTrapRef = useRef<FocusTrapManager | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Create focus trap if it doesn't exist
    if (!focusTrapRef.current) {
      focusTrapRef.current = createFocusTrap(element);
    }

    const focusTrap = focusTrapRef.current;

    if (active) {
      focusTrap.activate();
      onActivate?.();
    } else {
      focusTrap.deactivate();
      onDeactivate?.();
    }

    // Cleanup on unmount
    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
      }
    };
  }, [ref, active, onActivate, onDeactivate]);
}

/**
 * Hook for managing focus restoration
 * 
 * Saves the currently focused element and restores it when the component unmounts
 * or when explicitly triggered.
 */
export function useFocusRestore(): {
  save: () => void;
  restore: () => void;
} {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const save = () => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
  };

  const restore = () => {
    if (previouslyFocusedElement.current) {
      previouslyFocusedElement.current.focus();
      previouslyFocusedElement.current = null;
    }
  };

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      restore();
    };
  }, []);

  return { save, restore };
}

/**
 * Hook for managing initial focus
 * 
 * Focuses an element when the component mounts or when a condition becomes true
 */
export function useInitialFocus(
  ref: RefObject<HTMLElement>,
  condition: boolean = true
): void {
  useEffect(() => {
    if (condition && ref.current) {
      // Use setTimeout to ensure the element is rendered and focusable
      setTimeout(() => {
        ref.current?.focus();
      }, 0);
    }
  }, [ref, condition]);
}
