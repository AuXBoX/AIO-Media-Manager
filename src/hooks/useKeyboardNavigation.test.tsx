import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useKeyboardNavigation, useListNavigation } from './useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  it('should handle Enter key', () => {
    const onEnter = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() => useKeyboardNavigation(ref, { onEnter }));
    
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    ref.current.dispatchEvent(event);
    
    expect(onEnter).toHaveBeenCalled();
  });

  it('should handle Escape key', () => {
    const onEscape = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() => useKeyboardNavigation(ref, { onEscape }));
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    ref.current.dispatchEvent(event);
    
    expect(onEscape).toHaveBeenCalled();
  });

  it('should handle arrow keys', () => {
    const onArrowKey = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() => useKeyboardNavigation(ref, { onArrowKey }));
    
    const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    ref.current.dispatchEvent(upEvent);
    expect(onArrowKey).toHaveBeenCalledWith('up');
    
    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    ref.current.dispatchEvent(downEvent);
    expect(onArrowKey).toHaveBeenCalledWith('down');
    
    const leftEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    ref.current.dispatchEvent(leftEvent);
    expect(onArrowKey).toHaveBeenCalledWith('left');
    
    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    ref.current.dispatchEvent(rightEvent);
    expect(onArrowKey).toHaveBeenCalledWith('right');
  });

  it('should handle Home and End keys', () => {
    const onHome = vi.fn();
    const onEnd = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() => useKeyboardNavigation(ref, { onHome, onEnd }));
    
    const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
    ref.current.dispatchEvent(homeEvent);
    expect(onHome).toHaveBeenCalled();
    
    const endEvent = new KeyboardEvent('keydown', { key: 'End' });
    ref.current.dispatchEvent(endEvent);
    expect(onEnd).toHaveBeenCalled();
  });

  it('should respect disabled options', () => {
    const onEnter = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() => useKeyboardNavigation(ref, { onEnter, enableEnter: false }));
    
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    ref.current.dispatchEvent(event);
    
    expect(onEnter).not.toHaveBeenCalled();
  });
});

describe('useListNavigation', () => {
  it('should navigate down with ArrowDown', () => {
    const onIndexChange = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() =>
      useListNavigation(ref, {
        itemCount: 5,
        currentIndex: 0,
        onIndexChange,
      })
    );
    
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    ref.current.dispatchEvent(event);
    
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('should navigate up with ArrowUp', () => {
    const onIndexChange = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() =>
      useListNavigation(ref, {
        itemCount: 5,
        currentIndex: 2,
        onIndexChange,
      })
    );
    
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    ref.current.dispatchEvent(event);
    
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it('should wrap around when enabled', () => {
    const onIndexChange = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() =>
      useListNavigation(ref, {
        itemCount: 5,
        currentIndex: 4,
        onIndexChange,
        wrap: true,
      })
    );
    
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    ref.current.dispatchEvent(event);
    
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('should not wrap around when disabled', () => {
    const onIndexChange = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() =>
      useListNavigation(ref, {
        itemCount: 5,
        currentIndex: 4,
        onIndexChange,
        wrap: false,
      })
    );
    
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    ref.current.dispatchEvent(event);
    
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('should handle Home key', () => {
    const onIndexChange = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() =>
      useListNavigation(ref, {
        itemCount: 5,
        currentIndex: 3,
        onIndexChange,
      })
    );
    
    const event = new KeyboardEvent('keydown', { key: 'Home' });
    ref.current.dispatchEvent(event);
    
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('should handle End key', () => {
    const onIndexChange = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() =>
      useListNavigation(ref, {
        itemCount: 5,
        currentIndex: 0,
        onIndexChange,
      })
    );
    
    const event = new KeyboardEvent('keydown', { key: 'End' });
    ref.current.dispatchEvent(event);
    
    expect(onIndexChange).toHaveBeenCalledWith(4);
  });

  it('should activate item on Enter', () => {
    const onActivate = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() =>
      useListNavigation(ref, {
        itemCount: 5,
        currentIndex: 2,
        onIndexChange: vi.fn(),
        onActivate,
      })
    );
    
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    ref.current.dispatchEvent(event);
    
    expect(onActivate).toHaveBeenCalledWith(2);
  });

  it('should activate item on Space', () => {
    const onActivate = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() =>
      useListNavigation(ref, {
        itemCount: 5,
        currentIndex: 2,
        onIndexChange: vi.fn(),
        onActivate,
      })
    );
    
    const event = new KeyboardEvent('keydown', { key: ' ' });
    ref.current.dispatchEvent(event);
    
    expect(onActivate).toHaveBeenCalledWith(2);
  });

  it('should support horizontal orientation', () => {
    const onIndexChange = vi.fn();
    const ref = { current: document.createElement('div') };
    
    renderHook(() =>
      useListNavigation(ref, {
        itemCount: 5,
        currentIndex: 0,
        onIndexChange,
        orientation: 'horizontal',
      })
    );
    
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    ref.current.dispatchEvent(event);
    
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });
});
