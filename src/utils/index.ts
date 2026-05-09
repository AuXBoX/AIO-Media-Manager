/**
 * Utility functions and helpers
 */

// Error handling
export {
  ErrorCategory,
  AppError,
  classifyError,
  getErrorMessage,
  ERROR_MESSAGES,
  retryWithBackoff,
  LogLevel,
  ConsoleLogger,
  logger,
  logError,
  type Logger,
  type ErrorRecoveryStrategy,
} from './errorHandling';

// Image transcoding
export { getTranscodedImageUrl } from './imageTranscoding';

// Example utilities
export { getOptimalConnection } from './example';

// Accessibility utilities
export {
  announceToScreenReader,
  getFirstFocusableElement,
  getLastFocusableElement,
  getFocusableElements,
  trapFocus,
  generateId,
  isElementVisible,
  restoreFocus,
  createFocusTrap,
  type FocusTrapManager,
} from './accessibility';
