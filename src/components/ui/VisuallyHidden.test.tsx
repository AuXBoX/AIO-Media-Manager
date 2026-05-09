import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('should render children', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);
    
    expect(screen.getByText('Hidden text')).toBeInTheDocument();
  });

  it('should have sr-only class', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);
    
    const element = screen.getByText('Hidden text');
    expect(element).toHaveClass('sr-only');
  });

  it('should render as span by default', () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);
    
    const element = screen.getByText('Hidden text');
    expect(element.tagName).toBe('SPAN');
  });

  it('should render as custom element', () => {
    render(<VisuallyHidden as="div">Hidden text</VisuallyHidden>);
    
    const element = screen.getByText('Hidden text');
    expect(element.tagName).toBe('DIV');
  });

  it('should be accessible to screen readers', () => {
    render(
      <button>
        <svg aria-hidden="true">Icon</svg>
        <VisuallyHidden>Close dialog</VisuallyHidden>
      </button>
    );
    
    const button = screen.getByRole('button', { name: 'Close dialog' });
    expect(button).toBeInTheDocument();
  });
});
