import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { AppError, ErrorCategory } from '@/utils/errorHandling';

// Component that throws an error
function ThrowError({ error }: { error: Error }): null {
  throw error;
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders default fallback UI when an error occurs', () => {
    const error = new Error('Test error');

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const error = new Error('Test error');
    const fallback = (error: AppError) => <div>Custom Error: {error.message}</div>;

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Custom Error:/)).toBeInTheDocument();
  });

  it('shows retry button for recoverable errors', () => {
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network error',
      { recoverable: true }
    );

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('calls onError callback when error occurs', () => {
    const error = new Error('Test error');
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
  });

  it('resets error state when retry button is clicked', async () => {
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network error',
      { recoverable: true }
    );

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    retryButton.click();

    // After reset, should render children again
    rerender(
      <ErrorBoundary>
        <div>Recovered Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered Content')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';

    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network error',
      { details: { status: 500 } }
    );

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error Details')).toBeInTheDocument();

    process.env['NODE_ENV'] = originalEnv;
  });
});
