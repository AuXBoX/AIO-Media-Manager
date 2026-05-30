# Error UI Components Usage Guide

This guide demonstrates how to use the error UI components in the AIO Media Manager application.

## Components Overview

- **ErrorBoundary**: React error boundary for catching rendering errors
- **ErrorMessage**: Reusable error display component with multiple variants
- **RetryButton**: Button with loading state for retrying failed operations
- **ConnectionErrorPage**: Full-page error display for connection issues
- **Toast**: Enhanced toast notifications with error support
- **useToast**: Hook for managing toast notifications

## ErrorBoundary

Wrap your application or specific components to catch rendering errors:

```tsx
import { ErrorBoundary } from '@/components/ui';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}

// With custom fallback
<ErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h1>Oops! {error.message}</h1>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
  onError={(error, errorInfo) => {
    // Log to error tracking service
    console.error('Error caught:', error, errorInfo);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

## ErrorMessage

Display errors in different formats:

```tsx
import { ErrorMessage } from '@/components/ui';
import { AppError, ErrorCategory } from '@/utils/errorHandling';

// Inline variant (default)
<ErrorMessage
  error="Something went wrong"
  onRetry={() => refetch()}
/>

// With AppError object
const error = new AppError(
  ErrorCategory.NETWORK,
  'NETWORK_ERROR',
  'Failed to connect to server',
  { retryable: true }
);

<ErrorMessage
  error={error}
  onRetry={() => retryConnection()}
/>

// Banner variant
<ErrorMessage
  error={error}
  variant="banner"
  onRetry={() => retryConnection()}
  onDismiss={() => setError(null)}
/>

// Modal variant
<ErrorMessage
  error={error}
  variant="modal"
  onRetry={() => retryConnection()}
  onDismiss={() => setError(null)}
/>
```

## RetryButton

Standalone retry button with loading state:

```tsx
import { RetryButton } from '@/components/ui';

<RetryButton
  onRetry={async () => {
    await refetchData();
  }}
  disabled={isLoading}
>
  Try Again
</RetryButton>
```

## ConnectionErrorPage

Full-page error for connection issues:

```tsx
import { ConnectionErrorPage } from '@/components/ui';

function ServerConnectionError() {
  const { reconnect } = useServerConnection();
  
  return (
    <ConnectionErrorPage
      onRetry={reconnect}
      serverName="My Plex Server"
      isOffline={!navigator.onLine}
    />
  );
}
```

## Toast Notifications

Enhanced toast notifications with error support:

```tsx
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui';
import { classifyError } from '@/utils/errorHandling';

function MyComponent() {
  const { toasts, showToast, showError, removeToast } = useToast();
  
  const handleOperation = async () => {
    try {
      await someOperation();
      showToast('Operation successful!', 'success');
    } catch (error) {
      const appError = classifyError(error);
      showError(appError, () => handleOperation());
    }
  };
  
  return (
    <>
      <button onClick={handleOperation}>Do Something</button>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
```

## Integration with Error Handling System

The error UI components integrate seamlessly with the error handling system:

```tsx
import { classifyError, logError } from '@/utils/errorHandling';
import { useToast } from '@/hooks/useToast';
import { ErrorMessage } from '@/components/ui';

function DataFetcher() {
  const [error, setError] = useState<AppError | null>(null);
  const { showError } = useToast();
  
  const fetchData = async () => {
    try {
      const data = await api.getData();
      return data;
    } catch (err) {
      const appError = classifyError(err);
      logError(appError);
      
      // Show toast for transient errors
      if (appError.category === ErrorCategory.NETWORK) {
        showError(appError, () => fetchData());
      } else {
        // Show persistent error message for other errors
        setError(appError);
      }
    }
  };
  
  if (error) {
    return (
      <ErrorMessage
        error={error}
        variant="banner"
        onRetry={error.retryable ? () => fetchData() : undefined}
        onDismiss={() => setError(null)}
      />
    );
  }
  
  return <YourComponent />;
}
```

## Best Practices

1. **Use ErrorBoundary at the top level** to catch unexpected errors
2. **Use Toast for transient errors** (network issues, temporary failures)
3. **Use ErrorMessage for persistent errors** that need user attention
4. **Use ConnectionErrorPage for critical connection failures**
5. **Always provide retry options** for retryable errors
6. **Log errors** using the error handling system
7. **Classify errors** using `classifyError()` for consistent handling

## Accessibility

All error UI components follow accessibility best practices:

- Proper ARIA roles and labels
- Keyboard navigation support
- Screen reader friendly
- Focus management
- Color contrast compliance

## Styling

Components use Tailwind CSS classes and can be customized:

```tsx
<ErrorMessage
  error="Custom error"
  className="my-custom-class"
/>
```

## Error Categories

The error handling system classifies errors into categories:

- `AUTHENTICATION`: Auth token expired, permission denied
- `NETWORK`: Connection timeout, server unreachable
- `SERVER`: Server errors (500, 503)
- `VALIDATION`: Invalid input, validation failures
- `CACHE`: Storage quota exceeded, cache errors
- `PERMISSION`: Permission denied
- `UNKNOWN`: Unclassified errors

Each category has appropriate recovery strategies and user messaging.
