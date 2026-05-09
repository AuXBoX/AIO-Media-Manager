/**
 * Accessibility Utilities
 * 
 * Utilities for managing focus, announcements, and accessibility features
 */

/**
 * Announce a message to screen readers using ARIA live regions
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Get the first focusable element within a container
 */
export function getFirstFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return container.querySelector<HTMLElement>(focusableSelectors);
}

/**
 * Get the last focusable element within a container
 */
export function getLastFocusableElement(container: HTMLElement): HTMLElement | null {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const elements = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
  return elements[elements.length - 1] || null;
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors));
}

/**
 * Trap focus within a container (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }
}

/**
 * Generate a unique ID for accessibility attributes
 */
let idCounter = 0;
export function generateId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Check if an element is visible (for focus management)
 */
export function isElementVisible(element: HTMLElement): boolean {
  return !!(
    element.offsetWidth ||
    element.offsetHeight ||
    element.getClientRects().length
  );
}

/**
 * Restore focus to a previously focused element
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && isElementVisible(element)) {
    element.focus();
  }
}

/**
 * Create a focus trap manager
 */
export interface FocusTrapManager {
  activate: () => void;
  deactivate: () => void;
}

export function createFocusTrap(container: HTMLElement): FocusTrapManager {
  let previouslyFocusedElement: HTMLElement | null = null;
  let isActive = false;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive) return;
    trapFocus(container, event);
  };

  return {
    activate: () => {
      if (isActive) return;

      previouslyFocusedElement = document.activeElement as HTMLElement;
      isActive = true;

      // Focus first element
      const firstFocusable = getFirstFocusableElement(container);
      if (firstFocusable) {
        firstFocusable.focus();
      }

      // Add event listener
      document.addEventListener('keydown', handleKeyDown);
    },

    deactivate: () => {
      if (!isActive) return;

      isActive = false;
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus
      if (previouslyFocusedElement) {
        restoreFocus(previouslyFocusedElement);
      }
    },
  };
}
