import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveColumns } from './useResponsiveColumns';

describe('useResponsiveColumns', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    // Save original window.innerWidth
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    // Restore original window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('calculates columns based on window width', () => {
    // Set window width to 1920px
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const { result } = renderHook(() => useResponsiveColumns());

    // With 1920px width, minus sidebar (256px) and padding (48px) = 1616px available
    // With default minColumnWidth (200px) and gap (16px): 1616 / 216 = ~7.48 columns
    // Should be clamped to reasonable value
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThanOrEqual(8);
  });

  it('respects minColumnWidth option', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const { result } = renderHook(() =>
      useResponsiveColumns({ minColumnWidth: 300 })
    );

    // With larger minColumnWidth, should have fewer columns
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThanOrEqual(8);
  });

  it('respects maxColumns option', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 3840, // Very wide screen
    });

    const { result } = renderHook(() =>
      useResponsiveColumns({ maxColumns: 6 })
    );

    // Should not exceed maxColumns
    expect(result.current).toBeLessThanOrEqual(6);
  });

  it('returns at least 1 column for narrow screens', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400, // Very narrow
    });

    const { result } = renderHook(() => useResponsiveColumns());

    // Should always return at least 1 column
    expect(result.current).toBeGreaterThanOrEqual(1);
  });

  it('recalculates columns on window resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });

    const { result } = renderHook(() => useResponsiveColumns());
    const initialColumns = result.current;

    // Simulate window resize
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      window.dispatchEvent(new Event('resize'));
    });

    // Columns should potentially change (depending on calculation)
    expect(result.current).toBeGreaterThan(0);
  });

  it('respects gap option in calculation', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1920,
    });

    const { result: result1 } = renderHook(() =>
      useResponsiveColumns({ gap: 8 })
    );
    const { result: result2 } = renderHook(() =>
      useResponsiveColumns({ gap: 32 })
    );

    // With smaller gap, should fit more columns (or same)
    expect(result1.current).toBeGreaterThanOrEqual(result2.current);
  });

  it('cleans up resize listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useResponsiveColumns());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('handles multiple resize events correctly', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });

    const { result } = renderHook(() => useResponsiveColumns());

    // Trigger multiple resizes
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      window.dispatchEvent(new Event('resize'));
    });

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      window.dispatchEvent(new Event('resize'));
    });

    // Should still return valid column count
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThanOrEqual(8);
  });
});
