import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PWAUpdatePrompt } from './PWAUpdatePrompt';
import { useRegisterSW } from 'virtual:pwa-register/react';

// Mock is already set up in tests/setup.ts
vi.mock('virtual:pwa-register/react');

describe('PWAUpdatePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when no update is available', () => {
    vi.mocked(useRegisterSW).mockReturnValue({
      offlineReady: [false, vi.fn()],
      needRefresh: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    });

    const { container } = render(<PWAUpdatePrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should render update prompt when update is available', async () => {
    vi.mocked(useRegisterSW).mockReturnValue({
      offlineReady: [false, vi.fn()],
      needRefresh: [true, vi.fn()],
      updateServiceWorker: vi.fn(),
    });

    render(<PWAUpdatePrompt />);
    
    await waitFor(() => {
      expect(screen.getByText('Update Available')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/A new version of AIO Media Manager is available/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Update Now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Later/i })).toBeInTheDocument();
  });

  it('should call updateServiceWorker when Update Now is clicked', async () => {
    const mockUpdateServiceWorker = vi.fn();
    vi.mocked(useRegisterSW).mockReturnValue({
      offlineReady: [false, vi.fn()],
      needRefresh: [true, vi.fn()],
      updateServiceWorker: mockUpdateServiceWorker,
    });

    render(<PWAUpdatePrompt />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Update Now/i })).toBeInTheDocument();
    });
    
    const updateButton = screen.getByRole('button', { name: /Update Now/i });
    fireEvent.click(updateButton);

    expect(mockUpdateServiceWorker).toHaveBeenCalledWith(true);
  });

  it('should hide prompt when Later is clicked', async () => {
    const mockSetNeedRefresh = vi.fn();
    const mockSetOfflineReady = vi.fn();
    vi.mocked(useRegisterSW).mockReturnValue({
      offlineReady: [false, mockSetOfflineReady],
      needRefresh: [true, mockSetNeedRefresh],
      updateServiceWorker: vi.fn(),
    });

    render(<PWAUpdatePrompt />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Later/i })).toBeInTheDocument();
    });
    
    const laterButton = screen.getByRole('button', { name: /Later/i });
    fireEvent.click(laterButton);

    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false);
    expect(mockSetOfflineReady).toHaveBeenCalledWith(false);
  });

  it('should hide prompt when close button is clicked', async () => {
    const mockSetNeedRefresh = vi.fn();
    const mockSetOfflineReady = vi.fn();
    vi.mocked(useRegisterSW).mockReturnValue({
      offlineReady: [false, mockSetOfflineReady],
      needRefresh: [true, mockSetNeedRefresh],
      updateServiceWorker: vi.fn(),
    });

    render(<PWAUpdatePrompt />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument();
    });
    
    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(mockSetNeedRefresh).toHaveBeenCalledWith(false);
    expect(mockSetOfflineReady).toHaveBeenCalledWith(false);
  });

  it('should log when service worker is registered', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mockRegistration = { update: vi.fn() };
    
    let onRegisteredCallback: ((registration: any) => void) | undefined;
    
    vi.mocked(useRegisterSW).mockImplementation((options: any) => {
      onRegisteredCallback = options.onRegistered;
      return {
        offlineReady: [false, vi.fn()],
        needRefresh: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
      };
    });

    render(<PWAUpdatePrompt />);
    
    if (onRegisteredCallback) {
      onRegisteredCallback(mockRegistration);
    }

    expect(consoleSpy).toHaveBeenCalledWith('Service Worker registered:', mockRegistration);
    consoleSpy.mockRestore();
  });

  it('should log error when service worker registration fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Registration failed');
    
    let onRegisterErrorCallback: ((error: Error) => void) | undefined;
    
    vi.mocked(useRegisterSW).mockImplementation((options: any) => {
      onRegisterErrorCallback = options.onRegisterError;
      return {
        offlineReady: [false, vi.fn()],
        needRefresh: [false, vi.fn()],
        updateServiceWorker: vi.fn(),
      };
    });

    render(<PWAUpdatePrompt />);
    
    if (onRegisterErrorCallback) {
      onRegisterErrorCallback(mockError);
    }

    expect(consoleSpy).toHaveBeenCalledWith('Service Worker registration error:', mockError);
    consoleSpy.mockRestore();
  });
});
