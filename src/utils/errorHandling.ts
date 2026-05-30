/**
 * Error Handling System
 * 
 * Provides error classification, recovery strategies, and user-friendly error messages
 * for the AIO Media Manager application.
 */

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  SERVER = 'server',
  VALIDATION = 'validation',
  CACHE = 'cache',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

/**
 * Application error class with additional metadata
 */
export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly details?: any;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly timestamp: number;

  constructor(
    category: ErrorCategory,
    code: string,
    message: string,
    options: {
      details?: any;
      recoverable?: boolean;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.code = code;
    this.details = options.details;
    this.recoverable = options.recoverable ?? true;
    this.retryable = options.retryable ?? false;
    this.timestamp = Date.now();

    // Maintain proper stack trace
    if (options.cause) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }

    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Classify an error into an appropriate category
 */
export function classifyError(error: any): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Axios/HTTP errors
  if (error.response) {
    const status = error.response.status;
    const statusText = error.response.statusText || 'Unknown error';

    // Authentication errors
    if (status === 401) {
      return new AppError(
        ErrorCategory.AUTHENTICATION,
        'AUTH_INVALID_TOKEN',
        'Your session has expired. Please sign in again.',
        {
          details: { status, statusText },
          recoverable: true,
          retryable: false,
          cause: error,
        }
      );
    }

    if (status === 403) {
      return new AppError(
        ErrorCategory.AUTHENTICATION,
        'AUTH_PERMISSION_DENIED',
        "You don't have permission to perform this action.",
        {
          details: { status, statusText },
          recoverable: false,
          retryable: false,
          cause: error,
        }
      );
    }

    // Server errors
    if (status === 503) {
      return new AppError(
        ErrorCategory.SERVER,
        'SERVER_MAINTENANCE',
        'The server is currently undergoing maintenance.',
        {
          details: { status, statusText },
          recoverable: true,
          retryable: true,
          cause: error,
        }
      );
    }

    if (status >= 500) {
      return new AppError(
        ErrorCategory.SERVER,
        'SERVER_ERROR',
        'The server encountered an error. Please try again later.',
        {
          details: { status, statusText },
          recoverable: true,
          retryable: true,
          cause: error,
        }
      );
    }

    // Validation errors
    if (status === 400) {
      return new AppError(
        ErrorCategory.VALIDATION,
        'VALIDATION_ERROR',
        'Invalid request. Please check your input.',
        {
          details: { status, statusText, data: error.response.data },
          recoverable: true,
          retryable: false,
          cause: error,
        }
      );
    }

    // Other HTTP errors
    return new AppError(
      ErrorCategory.SERVER,
      'HTTP_ERROR',
      `Server returned error: ${status} ${statusText}`,
      {
        details: { status, statusText },
        recoverable: true,
        retryable: status >= 500,
        cause: error,
      }
    );
  }

  // Network errors (no response)
  if (error.request) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return new AppError(
        ErrorCategory.NETWORK,
        'NETWORK_TIMEOUT',
        'The request timed out. Please check your connection and try again.',
        {
          details: { code: error.code },
          recoverable: true,
          retryable: true,
          cause: error,
        }
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      return new AppError(
        ErrorCategory.NETWORK,
        'NETWORK_DNS_FAILURE',
        'Unable to resolve server address. Please check your network connection.',
        {
          details: { code: error.code },
          recoverable: true,
          retryable: true,
          cause: error,
        }
      );
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      return new AppError(
        ErrorCategory.NETWORK,
        'NETWORK_SERVER_UNREACHABLE',
        'Unable to connect to your Plex server. Switching to offline mode.',
        {
          details: { code: error.code },
          recoverable: true,
          retryable: true,
          cause: error,
        }
      );
    }

    return new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'A network error occurred. Please check your connection.',
      {
        details: { code: error.code },
        recoverable: true,
        retryable: true,
        cause: error,
      }
    );
  }

  // Cache/Storage errors
  if (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
  ) {
    return new AppError(
      ErrorCategory.CACHE,
      'CACHE_QUOTA_EXCEEDED',
      'Storage is full. Please clear some cached data.',
      {
        details: { name: error.name },
        recoverable: true,
        retryable: false,
        cause: error,
      }
    );
  }

  if (error.name === 'InvalidStateError' || error.name === 'DataError') {
    return new AppError(
      ErrorCategory.CACHE,
      'CACHE_ERROR',
      'A cache error occurred. Please try clearing your cache.',
      {
        details: { name: error.name },
        recoverable: true,
        retryable: false,
        cause: error,
      }
    );
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return new AppError(
      ErrorCategory.VALIDATION,
      'VALIDATION_ERROR',
      error.message || 'Validation failed.',
      {
        details: error.details,
        recoverable: true,
        retryable: false,
        cause: error,
      }
    );
  }

  // Unknown errors
  return new AppError(
    ErrorCategory.UNKNOWN,
    'UNKNOWN_ERROR',
    error.message || 'An unexpected error occurred.',
    {
      details: { name: error.name, stack: error.stack },
      recoverable: true,
      retryable: false,
      cause: error,
    }
  );
}

/**
 * User-friendly error messages mapped by error code
 */
const ERROR_MESSAGES_MAP: Record<string, string> = {
  // Authentication
  AUTH_INVALID_TOKEN: 'Your session has expired. Please sign in again.',
  AUTH_PERMISSION_DENIED: "You don't have permission to perform this action.",
  AUTH_TOKEN_EXPIRED: 'Your authentication token has expired. Please sign in again.',

  // Network
  NETWORK_TIMEOUT: 'The request timed out. Please check your connection and try again.',
  NETWORK_OFFLINE: 'You appear to be offline. Some features may be unavailable.',
  NETWORK_SERVER_UNREACHABLE:
    'Unable to connect to your Plex server. Switching to offline mode.',
  NETWORK_DNS_FAILURE: 'Unable to resolve server address. Please check your network connection.',
  NETWORK_ERROR: 'A network error occurred. Please check your connection.',

  // Server
  SERVER_ERROR: 'The server encountered an error. Please try again later.',
  SERVER_MAINTENANCE: 'The server is currently undergoing maintenance.',
  SERVER_UNAVAILABLE: 'The server is temporarily unavailable. Please try again later.',

  // Validation
  VALIDATION_REQUIRED_FIELD: 'This field is required.',
  VALIDATION_INVALID_FORMAT: 'Please enter a valid value.',
  VALIDATION_ERROR: 'Please check your input and try again.',

  // Cache
  CACHE_QUOTA_EXCEEDED: 'Storage is full. Please clear some cached data.',
  CACHE_SYNC_CONFLICT: 'This item was modified on the server. Choose which version to keep.',
  CACHE_ERROR: 'A cache error occurred. Please try clearing your cache.',

  // Permission
  PERMISSION_DENIED: 'Permission denied. Please check your access rights.',

  // Unknown
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export const ERROR_MESSAGES = ERROR_MESSAGES_MAP;

/**
 * Get user-friendly error message for an error code
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES_MAP[code] || ERROR_MESSAGES_MAP['UNKNOWN_ERROR'] || 'An unexpected error occurred.';
}

/**
 * Error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  /**
   * Attempt automatic recovery with retry logic
   */
  retry(error: AppError, attempt: number): Promise<boolean>;

  /**
   * Fallback to alternative approach
   */
  fallback(error: AppError): Promise<void>;

  /**
   * Prompt user to re-authenticate
   */
  promptReauthentication(): Promise<void>;

  /**
   * Switch to offline mode
   */
  switchToOfflineMode(): Promise<void>;

  /**
   * Clear cache
   */
  clearCache(): Promise<void>;

  /**
   * Report error to logging service
   */
  reportError(error: AppError): Promise<void>;
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    shouldRetry = (error) => {
      const appError = classifyError(error);
      return appError.retryable;
    },
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt or error is not retryable
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error: Error, context?: any): void;
}

/**
 * Console logger implementation
 */
export class ConsoleLogger implements Logger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  debug(message: string, context?: any): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, context || '');
    }
  }

  info(message: string, context?: any): void {
    if (this.minLevel <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, context || '');
    }
  }

  warn(message: string, context?: any): void {
    if (this.minLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, context || '');
    }
  }

  error(message: string, error: Error, context?: any): void {
    if (this.minLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context: context || {},
      });
    }
  }
}

/**
 * Global logger instance
 */
export const logger = new ConsoleLogger(
  process.env['NODE_ENV'] === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

/**
 * Log an error with appropriate level
 */
export function logError(error: AppError, context?: any): void {
  const message = `${error.category.toUpperCase()}: ${error.code} - ${error.message}`;

  switch (error.category) {
    case ErrorCategory.AUTHENTICATION:
    case ErrorCategory.PERMISSION:
      logger.warn(message, { ...context, details: error.details });
      break;

    case ErrorCategory.VALIDATION:
      logger.info(message, { ...context, details: error.details });
      break;

    case ErrorCategory.NETWORK:
    case ErrorCategory.SERVER:
    case ErrorCategory.CACHE:
    case ErrorCategory.UNKNOWN:
      logger.error(message, error, { ...context, details: error.details });
      break;

    default:
      logger.error(message, error, { ...context, details: error.details });
  }
}
