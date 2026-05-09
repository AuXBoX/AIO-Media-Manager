import { useState, useCallback } from 'react';
import type { ToastType } from '@/components/ui/Toast';
import { AppError } from '@/utils/errorHandling';

interface Toast {
  id: string;
  message: string | AppError;
  type: ToastType;
  onRetry?: () => void;
}

interface UseToastResult {
  toasts: Toast[];
  showToast: (message: string | AppError, type?: ToastType, onRetry?: () => void) => void;
  showError: (error: AppError, onRetry?: () => void) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

/**
 * useToast Hook
 * 
 * Manages toast notifications with support for AppError objects
 */
export function useToast(): UseToastResult {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string | AppError, type: ToastType = 'info', onRetry?: () => void) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type, onRetry }]);
  }, []);

  const showError = useCallback((error: AppError, onRetry?: () => void) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message: error, type: 'error', onRetry }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    showToast,
    showError,
    removeToast,
    clearToasts,
  };
}
