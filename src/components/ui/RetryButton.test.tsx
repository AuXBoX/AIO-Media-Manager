import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RetryButton } from './RetryButton';

describe('RetryButton', () => {
  it('renders with default text', () => {
    render(<RetryButton onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders with custom children', () => {
    render(<RetryButton onRetry={vi.fn()}>Try Again</RetryButton>);
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('calls onRetry when clicked', async () => {
    const onRetry = vi.fn();
    render(<RetryButton onRetry={onRetry} />);
    
    const button = screen.getByRole('button');
    button.click();
    
    await waitFor(() => {
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state during async retry', async () => {
    const onRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<RetryButton onRetry={onRetry} />);
    
    const button = screen.getByRole('button');
    button.click();
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Retrying...')).toBeInTheDocument();
    });
    
    // Should return to normal state after completion
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('disables button when disabled prop is true', () => {
    render(<RetryButton onRetry={vi.fn()} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('does not call onRetry when disabled', () => {
    const onRetry = vi.fn();
    render(<RetryButton onRetry={onRetry} disabled />);
    
    const button = screen.getByRole('button');
    button.click();
    
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('prevents multiple simultaneous retries', async () => {
    let resolveCount = 0;
    const onRetry = vi.fn(() => new Promise(resolve => {
      resolveCount++;
      setTimeout(resolve, 100);
    }));
    render(<RetryButton onRetry={onRetry} />);
    
    const button = screen.getByRole('button');
    
    // Click multiple times rapidly
    button.click();
    await new Promise(resolve => setTimeout(resolve, 10));
    button.click();
    await new Promise(resolve => setTimeout(resolve, 10));
    button.click();
    
    // Wait for the first retry to complete
    await waitFor(() => {
      expect(resolveCount).toBe(1);
    }, { timeout: 200 });
    
    // Should only have been called once
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<RetryButton onRetry={vi.fn()} className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('shows retry icon when not loading', () => {
    const { container } = render(<RetryButton onRetry={vi.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows spinner icon when loading', async () => {
    const onRetry = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { container } = render(<RetryButton onRetry={onRetry} />);
    
    const button = screen.getByRole('button');
    button.click();
    
    await waitFor(() => {
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });
});
