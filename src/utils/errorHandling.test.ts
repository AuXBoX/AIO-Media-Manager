import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorCategory,
  AppError,
  classifyError,
  getErrorMessage,
  ERROR_MESSAGES,
  retryWithBackoff,
  LogLevel,
  ConsoleLogger,
  logError,
} from './errorHandling';

describe('ErrorCategory', () => {
  it('should have all required categories', () => {
    expect(ErrorCategory.AUTHENTICATION).toBe('authentication');
    expect(ErrorCategory.NETWORK).toBe('network');
    expect(ErrorCategory.SERVER).toBe('server');
    expect(ErrorCategory.VALIDATION).toBe('validation');
    expect(ErrorCategory.CACHE).toBe('cache');
    expect(ErrorCategory.PERMISSION).toBe('permission');
    expect(ErrorCategory.UNKNOWN).toBe('unknown');
  });
});

describe('AppError', () => {
  it('should create an error with required fields', () => {
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_TIMEOUT',
      'Request timed out'
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.category).toBe(ErrorCategory.NETWORK);
    expect(error.code).toBe('NETWORK_TIMEOUT');
    expect(error.message).toBe('Request timed out');
    expect(error.recoverable).toBe(true);
    expect(error.retryable).toBe(false);
    expect(error.timestamp).toBeGreaterThan(0);
  });

  it('should accept optional fields', () => {
    const error = new AppError(
      ErrorCategory.SERVER,
      'SERVER_ERROR',
      'Internal server error',
      {
        details: { status: 500 },
        recoverable: false,
        retryable: true,
      }
    );

    expect(error.details).toEqual({ status: 500 });
    expect(error.recoverable).toBe(false);
    expect(error.retryable).toBe(true);
  });

  it('should include cause in stack trace', () => {
    const cause = new Error('Original error');
    const error = new AppError(
      ErrorCategory.UNKNOWN,
      'UNKNOWN_ERROR',
      'Wrapped error',
      { cause }
    );

    expect(error.stack).toContain('Caused by:');
    expect(error.stack).toContain('Original error');
  });

  it('should work with instanceof checks', () => {
    const error = new AppError(
      ErrorCategory.VALIDATION,
      'VALIDATION_ERROR',
      'Invalid input'
    );

    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });
});

describe('classifyError', () => {
  it('should return AppError as-is', () => {
    const appError = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network error'
    );
    const result = classifyError(appError);

    expect(result).toBe(appError);
  });

  describe('HTTP errors', () => {
    it('should classify 401 as authentication error', () => {
      const error = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
        },
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.code).toBe('AUTH_INVALID_TOKEN');
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(false);
    });

    it('should classify 403 as permission denied', () => {
      const error = {
        response: {
          status: 403,
          statusText: 'Forbidden',
        },
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(result.code).toBe('AUTH_PERMISSION_DENIED');
      expect(result.recoverable).toBe(false);
      expect(result.retryable).toBe(false);
    });

    it('should classify 500 as server error', () => {
      const error = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
        },
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.SERVER);
      expect(result.code).toBe('SERVER_ERROR');
      expect(result.recoverable).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('should classify 503 as maintenance', () => {
      const error = {
        response: {
          status: 503,
          statusText: 'Service Unavailable',
        },
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.SERVER);
      expect(result.code).toBe('SERVER_MAINTENANCE');
      expect(result.retryable).toBe(true);
    });

    it('should classify 400 as validation error', () => {
      const error = {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { field: 'title', message: 'Required' },
        },
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.details.data).toEqual({ field: 'title', message: 'Required' });
      expect(result.retryable).toBe(false);
    });

    it('should classify other HTTP errors', () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found',
        },
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.SERVER);
      expect(result.code).toBe('HTTP_ERROR');
      expect(result.retryable).toBe(false);
    });
  });

  describe('Network errors', () => {
    it('should classify timeout errors', () => {
      const error = {
        request: {},
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.code).toBe('NETWORK_TIMEOUT');
      expect(result.retryable).toBe(true);
    });

    it('should classify DNS failures', () => {
      const error = {
        request: {},
        code: 'ENOTFOUND',
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.code).toBe('NETWORK_DNS_FAILURE');
      expect(result.retryable).toBe(true);
    });

    it('should classify connection refused', () => {
      const error = {
        request: {},
        code: 'ECONNREFUSED',
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.code).toBe('NETWORK_SERVER_UNREACHABLE');
      expect(result.retryable).toBe(true);
    });

    it('should classify generic network errors', () => {
      const error = {
        request: {},
        code: 'ENETUNREACH',
      };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.retryable).toBe(true);
    });
  });

  describe('Cache errors', () => {
    it('should classify quota exceeded errors', () => {
      const error = new Error('Storage quota exceeded');
      error.name = 'QuotaExceededError';

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.CACHE);
      expect(result.code).toBe('CACHE_QUOTA_EXCEEDED');
      expect(result.retryable).toBe(false);
    });

    it('should classify invalid state errors', () => {
      const error = new Error('Invalid state');
      error.name = 'InvalidStateError';

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.CACHE);
      expect(result.code).toBe('CACHE_ERROR');
    });
  });

  describe('Validation errors', () => {
    it('should classify validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      (error as any).details = { field: 'email', rule: 'format' };

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.code).toBe('VALIDATION_ERROR');
      expect(result.details).toEqual({ field: 'email', rule: 'format' });
    });
  });

  describe('Unknown errors', () => {
    it('should classify unknown errors', () => {
      const error = new Error('Something went wrong');

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.UNKNOWN);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('Something went wrong');
    });

    it('should handle errors without message', () => {
      const error = {};

      const result = classifyError(error);

      expect(result.category).toBe(ErrorCategory.UNKNOWN);
      expect(result.code).toBe('UNKNOWN_ERROR');
      expect(result.message).toBe('An unexpected error occurred.');
    });
  });
});

describe('getErrorMessage', () => {
  it('should return message for known error codes', () => {
    expect(getErrorMessage('AUTH_INVALID_TOKEN')).toBe(
      'Your session has expired. Please sign in again.'
    );
    expect(getErrorMessage('NETWORK_TIMEOUT')).toBe(
      'The request timed out. Please check your connection and try again.'
    );
    expect(getErrorMessage('SERVER_ERROR')).toBe(
      'The server encountered an error. Please try again later.'
    );
  });

  it('should return default message for unknown codes', () => {
    expect(getErrorMessage('UNKNOWN_CODE')).toBe(
      'An unexpected error occurred. Please try again.'
    );
  });

  it('should have messages for all categories', () => {
    // Authentication
    expect(ERROR_MESSAGES.AUTH_INVALID_TOKEN).toBeDefined();
    expect(ERROR_MESSAGES.AUTH_PERMISSION_DENIED).toBeDefined();

    // Network
    expect(ERROR_MESSAGES.NETWORK_TIMEOUT).toBeDefined();
    expect(ERROR_MESSAGES.NETWORK_OFFLINE).toBeDefined();
    expect(ERROR_MESSAGES.NETWORK_SERVER_UNREACHABLE).toBeDefined();

    // Server
    expect(ERROR_MESSAGES.SERVER_ERROR).toBeDefined();
    expect(ERROR_MESSAGES.SERVER_MAINTENANCE).toBeDefined();

    // Validation
    expect(ERROR_MESSAGES.VALIDATION_REQUIRED_FIELD).toBeDefined();
    expect(ERROR_MESSAGES.VALIDATION_INVALID_FORMAT).toBeDefined();

    // Cache
    expect(ERROR_MESSAGES.CACHE_QUOTA_EXCEEDED).toBeDefined();
    expect(ERROR_MESSAGES.CACHE_SYNC_CONFLICT).toBeDefined();

    // Unknown
    expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBeDefined();
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');

    const promise = retryWithBackoff(fn);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ request: {}, code: 'ECONNREFUSED' })
      .mockRejectedValueOnce({ request: {}, code: 'ECONNREFUSED' })
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, { initialDelay: 100 });
    
    // Fast-forward through all timers
    await vi.runAllTimersAsync();
    
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue({ response: { status: 400 } });

    const promise = retryWithBackoff(fn);
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toMatchObject({ response: { status: 400 } });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect maxAttempts', async () => {
    const fn = vi.fn().mockRejectedValue({ request: {}, code: 'ECONNREFUSED' });

    const promise = retryWithBackoff(fn, { maxAttempts: 2, initialDelay: 100 });
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toMatchObject({ code: 'ECONNREFUSED' });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    const fn = vi.fn().mockRejectedValue({ request: {}, code: 'ECONNREFUSED' });
    const delays: number[] = [];

    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: any, delay: number) => {
      delays.push(delay);
      callback();
      return 0 as any;
    }) as any);

    const promise = retryWithBackoff(fn, {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffFactor: 2,
    });
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toBeDefined();
    expect(delays).toEqual([1000, 2000]); // First retry: 1s, second retry: 2s
  });

  it('should respect maxDelay', async () => {
    const fn = vi.fn().mockRejectedValue({ request: {}, code: 'ECONNREFUSED' });
    const delays: number[] = [];

    vi.spyOn(global, 'setTimeout').mockImplementation(((callback: any, delay: number) => {
      delays.push(delay);
      callback();
      return 0 as any;
    }) as any);

    const promise = retryWithBackoff(fn, {
      maxAttempts: 4,
      initialDelay: 1000,
      backoffFactor: 10,
      maxDelay: 5000,
    });
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toBeDefined();
    expect(delays.every((d) => d <= 5000)).toBe(true);
  });

  it('should use custom shouldRetry function', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Custom error'));
    const shouldRetry = vi.fn().mockReturnValue(true);

    const promise = retryWithBackoff(fn, { shouldRetry, initialDelay: 100 });
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Custom error');
    expect(shouldRetry).toHaveBeenCalled();
  });
});

describe('ConsoleLogger', () => {
  let consoleDebugSpy: any;
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log debug messages when level is DEBUG', () => {
    const logger = new ConsoleLogger(LogLevel.DEBUG);
    logger.debug('Debug message', { foo: 'bar' });

    expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] Debug message', { foo: 'bar' });
  });

  it('should not log debug messages when level is INFO', () => {
    const logger = new ConsoleLogger(LogLevel.INFO);
    logger.debug('Debug message');

    expect(consoleDebugSpy).not.toHaveBeenCalled();
  });

  it('should log info messages', () => {
    const logger = new ConsoleLogger(LogLevel.INFO);
    logger.info('Info message', { data: 123 });

    expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] Info message', { data: 123 });
  });

  it('should log warn messages', () => {
    const logger = new ConsoleLogger(LogLevel.WARN);
    logger.warn('Warning message');

    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning message', '');
  });

  it('should log error messages with error details', () => {
    const logger = new ConsoleLogger(LogLevel.ERROR);
    const error = new Error('Test error');
    logger.error('Error occurred', error, { userId: '123' });

    expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error occurred', {
      error: {
        name: 'Error',
        message: 'Test error',
        stack: error.stack,
      },
      context: { userId: '123' },
    });
  });

  it('should respect minimum log level', () => {
    const logger = new ConsoleLogger(LogLevel.ERROR);

    logger.debug('Debug');
    logger.info('Info');
    logger.warn('Warn');
    logger.error('Error', new Error('test'));

    expect(consoleDebugSpy).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe('logError', () => {
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log authentication errors as warnings', () => {
    const error = new AppError(
      ErrorCategory.AUTHENTICATION,
      'AUTH_INVALID_TOKEN',
      'Token expired'
    );

    logError(error, { userId: '123' });

    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should log validation errors as info', () => {
    const error = new AppError(
      ErrorCategory.VALIDATION,
      'VALIDATION_ERROR',
      'Invalid input'
    );

    logError(error);

    expect(consoleInfoSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should log network errors as errors', () => {
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_TIMEOUT',
      'Request timed out'
    );

    logError(error);

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should log server errors as errors', () => {
    const error = new AppError(
      ErrorCategory.SERVER,
      'SERVER_ERROR',
      'Internal server error'
    );

    logError(error);

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should include context in logs', () => {
    const error = new AppError(
      ErrorCategory.CACHE,
      'CACHE_ERROR',
      'Cache failed',
      { details: { size: 1000 } }
    );

    logError(error, { operation: 'save' });

    // The logger.error method formats the call differently than expected
    // It passes message, then an object with error and context
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR] CACHE: CACHE_ERROR - Cache failed',
      expect.objectContaining({
        error: expect.objectContaining({
          name: 'AppError',
          message: 'Cache failed',
        }),
        context: expect.objectContaining({
          operation: 'save',
          details: { size: 1000 },
        }),
      })
    );
  });
});
