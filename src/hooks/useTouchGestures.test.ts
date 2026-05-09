import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTouchGestures } from './useTouchGestures';

describe('useTouchGestures', () => {
  it('should return a ref', () => {
    const { result } = renderHook(() => useTouchGestures());
    expect(result.current).toHaveProperty('current');
  });

  it('should call onSwipeRight when swiping right', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({ onSwipeRight, swipeThreshold: 50 })
    );

    // Create a mock element
    const element = document.createElement('div');
    result.current.current = element;

    // Simulate touch events
    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 200, clientY: 100 } as Touch],
    });

    element.dispatchEvent(touchStart);
    
    // Wait a bit to simulate fast swipe
    setTimeout(() => {
      element.dispatchEvent(touchEnd);
      expect(onSwipeRight).toHaveBeenCalled();
    }, 100);
  });

  it('should call onSwipeLeft when swiping left', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({ onSwipeLeft, swipeThreshold: 50 })
    );

    const element = document.createElement('div');
    result.current.current = element;

    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 200, clientY: 100 } as Touch],
    });
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 100, clientY: 100 } as Touch],
    });

    element.dispatchEvent(touchStart);
    
    setTimeout(() => {
      element.dispatchEvent(touchEnd);
      expect(onSwipeLeft).toHaveBeenCalled();
    }, 100);
  });

  it('should not trigger swipe if below threshold', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({ onSwipeRight, swipeThreshold: 100 })
    );

    const element = document.createElement('div');
    result.current.current = element;

    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 130, clientY: 100 } as Touch],
    });

    element.dispatchEvent(touchStart);
    
    setTimeout(() => {
      element.dispatchEvent(touchEnd);
      expect(onSwipeRight).not.toHaveBeenCalled();
    }, 100);
  });

  it('should not trigger when disabled', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({ onSwipeRight, enabled: false })
    );

    const element = document.createElement('div');
    result.current.current = element;

    const touchStart = new TouchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 100 } as Touch],
    });
    const touchEnd = new TouchEvent('touchend', {
      changedTouches: [{ clientX: 200, clientY: 100 } as Touch],
    });

    element.dispatchEvent(touchStart);
    element.dispatchEvent(touchEnd);

    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
