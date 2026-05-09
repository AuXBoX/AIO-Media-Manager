import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { useAppStore } from '@/store/appStore';
import * as offlineDetectionModule from '@/hooks/useOfflineDetection';

// Mock the offline detection hook
vi.mock('@/hooks/useOfflineDetection');

describe('App - Offline Detection Integration', () => {
  const mockSetOnlineStatus = vi.fn();
  const mockUseOfflineDetection = vi.fn();

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset the store state
    useAppStore.setState({
      serverConnection: { uri: 'http://localhost:32400' } as any,
      setOnlineStatus: mockSetOnlineStatus,
    } as any);

    // Default mock for useOfflineDetection
    mockUseOfflineDetection.mockReturnValue({
      isOnline: true,
      navigatorOnline: true,
      serverReachable: true,
      lastChecked: Date.now(),
      checkConnectivity: vi.fn(),
    });

    vi.mocked(offlineDetectionModule.useOfflineDetection).mockImplementation(
      mockUseOfflineDetection
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize offline detection with server URL from app store', () => {
    render(<App />);

    expect(mockUseOfflineDetection).toHaveBeenCalledWith({
      serverUrl: 'http://localhost:32400',
      checkInterval: 30000,
      pingTimeout: 5000,
      onStatusChange: expect.any(Function),
    });
  });

  it('should update app store when online status changes', async () => {
    render(<App />);

    // Get the onStatusChange callback
    const onStatusChange = mockUseOfflineDetection.mock.calls[0]?.[0]?.onStatusChange;
    if (!onStatusChange) {
      throw new Error('onStatusChange callback not found');
    }

    // Simulate status change
    onStatusChange(false);

    await waitFor(() => {
      expect(mockSetOnlineStatus).toHaveBeenCalledWith(false);
    });
  });

  it('should update app store on mount with initial online status', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockSetOnlineStatus).toHaveBeenCalledWith(true);
    });
  });

  it('should handle offline state', async () => {
    mockUseOfflineDetection.mockReturnValue({
      isOnline: false,
      navigatorOnline: false,
      serverReachable: false,
      lastChecked: Date.now(),
      checkConnectivity: vi.fn(),
    });

    render(<App />);

    await waitFor(() => {
      expect(mockSetOnlineStatus).toHaveBeenCalledWith(false);
    });
  });

  it('should handle missing server connection', () => {
    useAppStore.setState({
      serverConnection: null,
      setOnlineStatus: mockSetOnlineStatus,
    } as any);

    render(<App />);

    expect(mockUseOfflineDetection).toHaveBeenCalledWith({
      serverUrl: undefined,
      checkInterval: 30000,
      pingTimeout: 5000,
      onStatusChange: expect.any(Function),
    });
  });

  it('should render the app UI', () => {
    render(<App />);

    expect(screen.getByText('AIO Media Manager')).toBeInTheDocument();
    expect(
      screen.getByText(
        /View and edit metadata for movies, TV shows, and music in Plex Media Server libraries/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
  });
});
