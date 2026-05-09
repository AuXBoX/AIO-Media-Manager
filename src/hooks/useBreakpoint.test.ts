import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBreakpoint, useMediaQuery } from './useBreakpoint';

describe('useBreakpoint', () => {
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

  it('should detect mobile breakpoint', () => {
    setWindowWidth(375);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.currentBreakpoint).toBe('sm');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should detect tablet breakpoint', () => {
    setWindowWidth(768);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.currentBreakpoint).toBe('md');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should detect desktop breakpoint', () => {
    setWindowWidth(1280);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.currentBreakpoint).toBe('xl');
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('should update on window resize', () => {
    setWindowWidth(375);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isMobile).toBe(true);

    act(() => {
      setWindowWidth(1024);
    });

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('should correctly implement isAtLeast', () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isAtLeast('sm')).toBe(true);
    expect(result.current.isAtLeast('md')).toBe(true);
    expect(result.current.isAtLeast('lg')).toBe(true);
    expect(result.current.isAtLeast('xl')).toBe(false);
  });

  it('should correctly implement isAtMost', () => {
    setWindowWidth(1024);
    const { result } = renderHook(() => useBreakpoint());

    expect(result.current.isAtMost('sm')).toBe(false);
    expect(result.current.isAtMost('md')).toBe(false);
    expect(result.current.isAtMost('lg')).toBe(true);
    expect(result.current.isAtMost('xl')).toBe(true);
  });
});

describe('useMediaQuery', () => {
  it('should match media query', () => {
    const matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    window.matchMedia = matchMediaMock;

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('should not match media query', () => {
    const matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    window.matchMedia = matchMediaMock;

    const { result } = renderHook(() => useMediaQuery('(min-width: 1920px)'));
    expect(result.current).toBe(false);
  });
});
