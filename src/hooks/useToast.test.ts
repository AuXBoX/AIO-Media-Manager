import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast', () => {
  it('initializes with empty toasts array', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast with default type', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Test message');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Test message');
    expect(result.current.toasts[0].type).toBe('info');
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it('adds a toast with specified type', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Success message', 'success');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe('Success message');
    expect(result.current.toasts[0].type).toBe('success');
  });

  it('adds multiple toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message 1', 'info');
      result.current.showToast('Message 2', 'success');
      result.current.showToast('Message 3', 'error');
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].message).toBe('Message 1');
    expect(result.current.toasts[1].message).toBe('Message 2');
    expect(result.current.toasts[2].message).toBe('Message 3');
  });

  it('removes a toast by id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message 1');
      result.current.showToast('Message 2');
      result.current.showToast('Message 3');
    });

    const toastIdToRemove = result.current.toasts[1].id;

    act(() => {
      result.current.removeToast(toastIdToRemove);
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts.find((t) => t.id === toastIdToRemove)).toBeUndefined();
  });

  it('clears all toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message 1');
      result.current.showToast('Message 2');
      result.current.showToast('Message 3');
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.clearToasts();
    });

    expect(result.current.toasts).toEqual([]);
  });

  it('generates unique ids for each toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast('Message 1');
      result.current.showToast('Message 2');
      result.current.showToast('Message 3');
    });

    const ids = result.current.toasts.map((t) => t.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(3);
  });
});

  it('adds an error toast with showError', () => {
    const { result } = renderHook(() => useToast());
    const error = new (class extends Error {
      retryable = true;
      message = 'Network connection failed';
    })();

    act(() => {
      result.current.showError(error as any);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe(error);
    expect(result.current.toasts[0].type).toBe('error');
  });

  it('adds toast with onRetry callback', () => {
    const { result } = renderHook(() => useToast());
    const onRetry = () => console.log('retry');

    act(() => {
      result.current.showToast('Test message', 'error', onRetry);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].onRetry).toBe(onRetry);
  });
