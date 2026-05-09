import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNav, useMobileNav } from './MobileNav';

// Mock useBreakpoint hook
vi.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: () => ({
    isMobile: true,
    isTablet: false,
    isDesktop: false,
    currentBreakpoint: 'sm',
    isTouchDevice: true,
    isAtLeast: () => false,
    isAtMost: () => true,
  }),
}));

describe('MobileNav', () => {
  it('should render hamburger button when closed', () => {
    const onToggle = vi.fn();
    render(
      <MobileNav isOpen={false} onToggle={onToggle}>
        <div>Menu content</div>
      </MobileNav>
    );

    const button = screen.getByLabelText('Open menu');
    expect(button).toBeInTheDocument();
  });

  it('should render close button when open', () => {
    const onToggle = vi.fn();
    render(
      <MobileNav isOpen={true} onToggle={onToggle}>
        <div>Menu content</div>
      </MobileNav>
    );

    const button = screen.getByLabelText('Close menu');
    expect(button).toBeInTheDocument();
  });

  it('should call onToggle when button clicked', () => {
    const onToggle = vi.fn();
    render(
      <MobileNav isOpen={false} onToggle={onToggle}>
        <div>Menu content</div>
      </MobileNav>
    );

    const button = screen.getByLabelText('Open menu');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should show sidebar when open', () => {
    const onToggle = vi.fn();
    render(
      <MobileNav isOpen={true} onToggle={onToggle}>
        <div>Menu content</div>
      </MobileNav>
    );

    expect(screen.getByText('Menu content')).toBeInTheDocument();
  });

  it('should show backdrop when open', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <MobileNav isOpen={true} onToggle={onToggle}>
        <div>Menu content</div>
      </MobileNav>
    );

    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
    expect(backdrop).toBeInTheDocument();
  });

  it('should call onToggle when backdrop clicked', () => {
    const onToggle = vi.fn();
    const { container } = render(
      <MobileNav isOpen={true} onToggle={onToggle}>
        <div>Menu content</div>
      </MobileNav>
    );

    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onToggle).toHaveBeenCalledTimes(1);
    }
  });
});

describe('useMobileNav', () => {
  it('should return navigation state and controls', () => {
    const { result } = renderHook(() => useMobileNav());

    expect(result.current).toHaveProperty('isOpen');
    expect(result.current).toHaveProperty('toggle');
    expect(result.current).toHaveProperty('open');
    expect(result.current).toHaveProperty('close');
  });

  it('should toggle state', () => {
    const { result } = renderHook(() => useMobileNav());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should open', () => {
    const { result } = renderHook(() => useMobileNav());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('should close', () => {
    const { result } = renderHook(() => useMobileNav());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });
});

// Import renderHook and act for hook testing
import { renderHook, act } from '@testing-library/react';
