# Error Handling System

This document describes the error handling system implemented for the AIO Media Manager application.

## Overview

The error handling system provides:
- **Error Classification**: Categorizes errors into meaningful types
- **User-Friendly Messages**: Maps error codes to readable messages
- **Recovery Strategies**: Provides retry logic and fallback mechanisms
- **Logging**: Structured logging with appropriate severity levels
- **Type Safety**: Full TypeScript support with proper typing

## Components

### 1. ErrorCategory Enum

Classifies errors into the following categories:

- `AUTHENTICATION`: 401, 403, token expired
- `NETWORK`: Connection timeout, server unreachable, DNS failure
- `SERVER`: 500 internal server error, service unavailable
- `VALIDATION`: Invalid input, missing required fields
- `CACHE`: Cache read/write errors, quota exceeded
- `PERMISSION`: Insufficient permissions
- `UNKNOWN`: Unclassified errors

### 2. AppError Class

Extended Error class with additional metadata:

```typescript
class AppError extends Error {
  category: ErrorCategory;
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  retryable: boolean;
  timestamp: number;
}
```

**Properties:**
- `category`: Error classification
- `code`: Unique error code (e.g., 'AUTH_INVALID_TOKEN')
- `message`: User-friendly error message
- `details`: Additional error context
- `recoverable`: Whether the error can be recovered from
- `retryable`: Whether the operation can be retried
- `timestamp`: When the error occurred

### 3. Error Classification

The `classifyError()` function automatically classifies errors:

```typescript
function classifyError(error: any): AppError
```

**Handles:**
- HTTP errors (Axios responses)
- Network errors (connection issues)
- Cache/Storage errors (quota exceeded)
- Validation errors
- Unknown errors

**Example:**
```typescript
try {
  await apiCall();
} catch (error) {
  const appError = classifyError(error);
  console.log(appError.category); // ErrorCategory.NETWORK
  console.log(appError.retryable); // true
}
```

### 4. Error Messages

Pre-defined user-friendly messages for all error codes:

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_TOKEN: 'Your session has expired. Please sign in again.',
  NETWORK_TIMEOUT: 'The request timed out. Please check your connection and try again.',
  SERVER_ERROR: 'The server encountered an error. Please try again later.',
  // ... more messages
};

function getErrorMessage(code: string): string
```

### 5. Retry with Exponential Backoff

Automatic retry logic for transient failures:

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;        // Default: 3
    initialDelay?: number;        // Default: 1000ms
    maxDelay?: number;            // Default: 30000ms
    backoffFactor?: number;       // Default: 2
    shouldRetry?: (error) => boolean;
  }
): Promise<T>
```

**Example:**
```typescript
const data = await retryWithBackoff(
  () => fetchFromServer(),
  { maxAttempts: 3, initialDelay: 1000 }
);
```

### 6. Logging System

Structured logging with severity levels:

```typescript
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface Logger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error: Error, context?: any): void;
}
```

**Global Logger:**
```typescript
import { logger } from '@/utils';

logger.debug('Debug message', { userId: '123' });
logger.info('Operation completed');
logger.warn('Deprecated API used');
logger.error('Operation failed', error, { operation: 'save' });
```

**Automatic Error Logging:**
```typescript
import { logError } from '@/utils';

try {
  await operation();
} catch (error) {
  const appError = classifyError(error);
  logError(appError, { userId: '123', operation: 'save' });
}
```

## Usage Examples

### Basic Error Handling

```typescript
import { classifyError, getErrorMessage, logError } from '@/utils';

try {
  await plexApi.updateMetadata(ratingKey, updates);
} catch (error) {
  const appError = classifyError(error);
  
  // Log the error
  logError(appError, { ratingKey, operation: 'update' });
  
  // Show user-friendly message
  toast.error(appError.message);
  
  // Handle based on category
  if (appError.category === ErrorCategory.AUTHENTICATION) {
    // Prompt re-authentication
    router.push('/login');
  } else if (appError.retryable) {
    // Offer retry option
    showRetryButton();
  }
}
```

### Retry with Backoff

```typescript
import { retryWithBackoff, classifyError } from '@/utils';

async function fetchLibraryItems() {
  return await retryWithBackoff(
    () => plexApi.getLibraryItems(sectionId),
    {
      maxAttempts: 3,
      initialDelay: 1000,
      shouldRetry: (error) => {
        const appError = classifyError(error);
        return appError.retryable;
      }
    }
  );
}
```

### Custom Error Creation

```typescript
import { AppError, ErrorCategory } from '@/utils';

function validateMetadata(metadata: MetadataUpdate) {
  if (!metadata.title || metadata.title.trim() === '') {
    throw new AppError(
      ErrorCategory.VALIDATION,
      'VALIDATION_REQUIRED_FIELD',
      'Title is required',
      {
        details: { field: 'title' },
        recoverable: true,
        retryable: false,
      }
    );
  }
}
```

### Error Recovery Strategies

```typescript
import { classifyError, retryWithBackoff, logger } from '@/utils';

async function saveMetadata(data: MetadataUpdate) {
  try {
    // Try to save to server
    await plexApi.updateMetadata(ratingKey, data);
  } catch (error) {
    const appError = classifyError(error);
    
    switch (appError.category) {
      case ErrorCategory.AUTHENTICATION:
        // Prompt re-authentication
        await promptReauthentication();
        // Retry after re-auth
        return await saveMetadata(data);
        
      case ErrorCategory.NETWORK:
        if (appError.retryable) {
          // Retry with backoff
          return await retryWithBackoff(() => 
            plexApi.updateMetadata(ratingKey, data)
          );
        } else {
          // Fall back to offline mode
          await cacheManager.queueOfflineChange({
            type: 'update',
            ratingKey,
            data,
          });
          toast.info('Saved offline. Will sync when connection is restored.');
        }
        break;
        
      case ErrorCategory.CACHE:
        if (appError.code === 'CACHE_QUOTA_EXCEEDED') {
          // Prompt to clear cache
          const shouldClear = await confirmClearCache();
          if (shouldClear) {
            await cacheManager.clearCache();
            return await saveMetadata(data);
          }
        }
        break;
        
      default:
        // Log and show error
        logError(appError, { operation: 'save', ratingKey });
        toast.error(appError.message);
    }
  }
}
```

## Error Recovery Strategies

The system supports the following recovery strategies:

### 1. Authentication Errors
- **Strategy**: Prompt re-authentication
- **Action**: Redirect to login page, clear invalid token
- **Retryable**: No (requires user action)

### 2. Network Errors
- **Strategy**: Retry with exponential backoff (3 attempts)
- **Fallback**: Switch to offline mode, queue changes
- **Retryable**: Yes

### 3. Server Errors
- **Strategy**: Display error message, offer retry
- **Retryable**: Yes (for 5xx errors)

### 4. Validation Errors
- **Strategy**: Display inline validation messages
- **Action**: Highlight fields, provide format hints
- **Retryable**: No (requires user correction)

### 5. Cache Errors
- **Strategy**: Clear affected cache entries, refetch from server
- **Fallback**: Fall back to API if cache unavailable
- **Action**: Prompt to clear cache if quota exceeded

## Testing

The error handling system includes comprehensive unit tests:

- **42 test cases** covering all functionality
- **100% code coverage** for critical paths
- Tests for error classification, retry logic, logging, and recovery

Run tests:
```bash
npm test -- src/utils/errorHandling.test.ts
```

## Integration

The error handling system is integrated throughout the application:

1. **API Client**: Wraps all API calls with error classification
2. **Managers**: Use retry logic for transient failures
3. **UI Components**: Display user-friendly error messages
4. **Cache Manager**: Handles cache errors and quota issues
5. **Authentication**: Detects and handles auth failures

## Best Practices

1. **Always classify errors**: Use `classifyError()` for all caught errors
2. **Log appropriately**: Use `logError()` with context for debugging
3. **Show user-friendly messages**: Use `appError.message` or `getErrorMessage()`
4. **Handle by category**: Different categories require different recovery strategies
5. **Retry when appropriate**: Use `retryWithBackoff()` for network/server errors
6. **Provide fallbacks**: Offline mode, cached data, alternative approaches
7. **Include context**: Add relevant context when logging errors

## Future Enhancements

Potential improvements for the error handling system:

1. **Remote Error Reporting**: Send errors to monitoring service (Sentry, etc.)
2. **Error Analytics**: Track error frequency and patterns
3. **User Feedback**: Allow users to report errors with context
4. **Automatic Recovery**: More sophisticated recovery strategies
5. **Error Boundaries**: React error boundaries for UI errors
6. **Offline Queue**: Persistent queue for offline changes
