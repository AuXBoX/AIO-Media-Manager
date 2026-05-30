import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, SpinnerOverlay } from './Spinner';

describe('Spinner', () => {
  it('renders with default props', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with accessible label', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner).toBeInTheDocument();
  });

  it('applies size variants', () => {
    const { container: container1 } = render(<Spinner size="xs" />);
    expect(container1.querySelector('.h-3.w-3')).toBeInTheDocument();

    const { container: container2 } = render(<Spinner size="xl" />);
    expect(container2.querySelector('.h-12.w-12')).toBeInTheDocument();
  });

  it('applies variant styles', () => {
    const { container } = render(<Spinner variant="primary" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('text-primary-500');
  });
});

describe('SpinnerOverlay', () => {
  it('renders overlay with spinner', () => {
    const { container } = render(<SpinnerOverlay />);
    const overlay = container.querySelector('.absolute.inset-0');
    expect(overlay).toBeInTheDocument();
  });

  it('displays message when provided', () => {
    render(<SpinnerOverlay message="Saving changes..." />);
    expect(screen.getByText('Saving changes...')).toBeInTheDocument();
  });

  it('applies opacity prop', () => {
    const { container } = render(<SpinnerOverlay opacity={50} />);
    const overlay = container.querySelector('.absolute.inset-0') as HTMLElement;
    expect(overlay).toHaveStyle({ opacity: 0.5 });
  });
});
