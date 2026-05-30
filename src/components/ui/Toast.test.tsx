import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Toast, ToastContainer } from './Toast';
import { AppError, ErrorCategory } from '@/utils/errorHandling';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders string message', () => {
    const onClose = vi.fn();
    render(<Toast message="Test message" onClose={onClose} />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders AppError message', () => {
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network connection failed'
    );
    const onClose = vi.fn();

    render(<Toast message={error} onClose={onClose} />);
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
  });

  it('renders success toast with correct styling', () => {
    const onClose = vi.fn();
    render(<Toast message="Success" type="success" onClose={onClose} />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-green-600');
  });

  it('renders error toast with correct styling', () => {
    const onClose = vi.fn();
    render(<Toast message="Error" type="error" onClose={onClose} />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-red-600');
  });

  it('renders info toast with correct styling', () => {
    const onClose = vi.fn();
    render(<Toast message="Info" type="info" onClose={onClose} />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-primary-600');
  });

  it('renders warning toast with correct styling', () => {
    const onClose = vi.fn();
    render(<Toast message="Warning" type="warning" onClose={onClose} />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveClass('bg-yellow-600');
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close');
    closeButton.click();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('auto-closes after duration', async () => {
    const onClose = vi.fn();
    render(<Toast message="Test" duration={3000} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not auto-close when duration is 0', async () => {
    const onClose = vi.fn();
    render(<Toast message="Test" duration={0} onClose={onClose} />);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not auto-close when retry button is shown', () => {
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network error',
      { retryable: true }
    );
    const onClose = vi.fn();
    const onRetry = vi.fn();

    render(<Toast message={error} duration={3000} onClose={onClose} onRetry={onRetry} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows retry button for retryable errors', () => {
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network error',
      { retryable: true }
    );
    const onRetry = vi.fn();

    render(<Toast message={error} onClose={vi.fn()} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    retryButton.click();
    expect(onRetry).toHaveBeenCalled();
  });

  it('does not show retry button for non-retryable errors', () => {
    const error = new AppError(
      ErrorCategory.VALIDATION,
      'VALIDATION_ERROR',
      'Validation failed',
      { retryable: false }
    );

    render(<Toast message={error} onClose={vi.fn()} onRetry={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });
});

describe('ToastContainer', () => {
  it('renders nothing when toasts array is empty', () => {
    const { container } = render(<ToastContainer toasts={[]} onRemove={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders multiple toasts', () => {
    const toasts = [
      { id: '1', message: 'Toast 1', type: 'info' as const },
      { id: '2', message: 'Toast 2', type: 'success' as const },
      { id: '3', message: 'Toast 3', type: 'error' as const },
    ];

    render(<ToastContainer toasts={toasts} onRemove={vi.fn()} />);

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
  });

  it('calls onRemove with correct id when toast is closed', async () => {
    const onRemove = vi.fn();
    const toasts = [
      { id: '1', message: 'Toast 1', type: 'info' as const },
      { id: '2', message: 'Toast 2', type: 'success' as const },
    ];

    render(<ToastContainer toasts={toasts} onRemove={onRemove} />);

    const closeButtons = screen.getAllByLabelText('Close');
    closeButtons[0].click();

    expect(onRemove).toHaveBeenCalledWith('1');
  });

  it('passes onRetry to Toast components', () => {
    const onRetry = vi.fn();
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network error',
      { retryable: true }
    );
    const toasts = [
      { id: '1', message: error, type: 'error' as const, onRetry },
    ];

    render(<ToastContainer toasts={toasts} onRemove={vi.fn()} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    retryButton.click();

    expect(onRetry).toHaveBeenCalled();
  });
});
