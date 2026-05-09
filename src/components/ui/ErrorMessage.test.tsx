import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorMessage } from './ErrorMessage';
import { AppError, ErrorCategory } from '@/utils/errorHandling';

describe('ErrorMessage', () => {
  it('renders string error message', () => {
    render(<ErrorMessage error="Test error message" />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders AppError message', () => {
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network connection failed'
    );

    render(<ErrorMessage error={error} />);
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
  });

  it('renders inline variant by default', () => {
    render(<ErrorMessage error="Test error" />);
    const alert = screen.getByRole('alert');
    expect(alert).not.toHaveClass('bg-red-50'); // Not banner style
  });

  it('renders banner variant', () => {
    render(<ErrorMessage error="Test error" variant="banner" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-50');
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders modal variant', () => {
    render(<ErrorMessage error="Test error" variant="modal" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('shows retry button for retryable errors', () => {
    const error = new AppError(
      ErrorCategory.NETWORK,
      'NETWORK_ERROR',
      'Network error',
      { retryable: true }
    );
    const onRetry = vi.fn();

    render(<ErrorMessage error={error} onRetry={onRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /try again/i });
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

    render(<ErrorMessage error={error} onRetry={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismiss = vi.fn();

    render(<ErrorMessage error="Test error" variant="banner" onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
    
    dismissButton.click();
    expect(onDismiss).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ErrorMessage error="Test error" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('modal variant shows close button', () => {
    const onDismiss = vi.fn();

    render(<ErrorMessage error="Test error" variant="modal" onDismiss={onDismiss} />);
    
    const closeButtons = screen.getAllByRole('button', { name: /close/i });
    expect(closeButtons.length).toBeGreaterThan(0);
  });
});
