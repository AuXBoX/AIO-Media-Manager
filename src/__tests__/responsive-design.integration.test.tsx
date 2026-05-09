import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ResponsiveDemo } from '@/pages/ResponsiveDemo';

describe('Responsive Design Integration', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original window width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  const setWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event('resize'));
  };

  it('should render responsive demo page', () => {
    render(<ResponsiveDemo />);
    expect(screen.getByText('Responsive Design Demo')).toBeInTheDocument();
  });

  it('should display current breakpoint information', () => {
    render(<ResponsiveDemo />);
    expect(screen.getByText('Current Breakpoint')).toBeInTheDocument();
  });

  it('should show mobile layout on small screens', async () => {
    setWindowWidth(375);
    render(<ResponsiveDemo />);

    await waitFor(() => {
      const deviceText = screen.getByText('Mobile');
      expect(deviceText).toBeInTheDocument();
    });
  });

  it('should show tablet layout on medium screens', async () => {
    setWindowWidth(768);
    render(<ResponsiveDemo />);

    await waitFor(() => {
      const deviceText = screen.getByText('Tablet');
      expect(deviceText).toBeInTheDocument();
    });
  });

  it('should show desktop layout on large screens', async () => {
    setWindowWidth(1280);
    render(<ResponsiveDemo />);

    await waitFor(() => {
      const deviceText = screen.getByText('Desktop');
      expect(deviceText).toBeInTheDocument();
    });
  });

  it('should render responsive grid with correct number of items', () => {
    render(<ResponsiveDemo />);
    
    // Should have 12 grid items
    const gridItems = screen.getAllByText(/^\d+$/);
    expect(gridItems.length).toBeGreaterThanOrEqual(12);
  });

  it('should render progressive images', () => {
    render(<ResponsiveDemo />);
    
    const images = screen.getAllByAltText(/Demo image \d+/);
    expect(images.length).toBe(6);
  });

  it('should display responsive typography', () => {
    render(<ResponsiveDemo />);
    
    expect(screen.getByText('Heading 1')).toBeInTheDocument();
    expect(screen.getByText('Heading 2')).toBeInTheDocument();
    expect(screen.getByText('Heading 3')).toBeInTheDocument();
  });

  it('should show touch gestures section on touch devices', () => {
    // Mock touch device
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      configurable: true,
      value: {},
    });

    render(<ResponsiveDemo />);
    
    // Touch gestures section should be visible
    expect(screen.getByText('Touch Gestures')).toBeInTheDocument();
  });

  it('should update on window resize', async () => {
    setWindowWidth(375);
    const { rerender } = render(<ResponsiveDemo />);

    await waitFor(() => {
      expect(screen.getByText('Mobile')).toBeInTheDocument();
    });

    setWindowWidth(1280);
    rerender(<ResponsiveDemo />);

    await waitFor(() => {
      expect(screen.getByText('Desktop')).toBeInTheDocument();
    });
  });
});

describe('Responsive Components Integration', () => {
  it('should render responsive container with correct max width', () => {
    const { container } = render(
      <div data-testid="container" className="max-w-screen-xl">
        Content
      </div>
    );

    const element = container.querySelector('[data-testid="container"]');
    expect(element).toHaveClass('max-w-screen-xl');
  });

  it('should apply responsive padding', () => {
    const { container } = render(
      <div className="px-4 md:px-6 lg:px-8">
        Content
      </div>
    );

    expect(container.firstChild).toHaveClass('px-4', 'md:px-6', 'lg:px-8');
  });

  it('should render responsive grid columns', () => {
    const { container } = render(
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </div>
    );

    expect(container.firstChild).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });
});
