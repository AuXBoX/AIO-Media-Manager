import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsView } from './SettingsView';
import { getSettingsManager, DEFAULT_SETTINGS } from '@/managers/SettingsManager';

// Mock the settings manager
vi.mock('@/managers/SettingsManager', () => {
  const mockManager = {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    resetSettings: vi.fn(),
  };

  return {
    getSettingsManager: vi.fn(() => mockManager),
    DEFAULT_SETTINGS: {
      theme: 'system',
      language: 'en',
      defaultView: 'grid',
      gridColumns: 4,
      thumbnailQuality: 'medium',
      defaultMetadataProvider: 'tmdb',
      cacheEnabled: true,
      maxCacheSize: 1024,
      cacheRetentionDays: 30,
      autoSync: true,
      syncInterval: 15,
      offlineModeEnabled: true,
      autoClearInterval: 7,
      metadataSaveMode: 'plex',
      localMetadataFormat: 'nfo',
      createNfoBackups: true,
      nfoTemplate: 'kodi',
      autoSyncLocalChanges: false,
      pageSize: 50,
      imagePreloadCount: 10,
      enableLazyLoading: true,
      enableVirtualScrolling: true,
      imageQuality: 'medium',
      analyticsEnabled: false,
      errorReporting: true,
      usageStatistics: false,
    },
  };
});

describe('SettingsView', () => {
  const mockManager = getSettingsManager();

  beforeEach(() => {
    vi.clearAllMocks();
    (mockManager.getSettings as any).mockResolvedValue(DEFAULT_SETTINGS);
    (mockManager.updateSettings as any).mockResolvedValue(undefined);
    (mockManager.resetSettings as any).mockResolvedValue(undefined);
  });

  it('should render settings view', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Cache & Offline')).toBeInTheDocument();
    expect(screen.getByText('Local Metadata')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    render(<SettingsView />);

    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('should load settings on mount', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(mockManager.getSettings).toHaveBeenCalled();
    });
  });

  it('should switch between tabs', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });

    const cacheTab = screen.getByText('Cache & Offline');
    fireEvent.click(cacheTab);

    expect(screen.getByText('Cache & Offline Settings')).toBeInTheDocument();
  });

  it('should display general settings by default', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });
  });

  it('should save settings when save is clicked', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });

    // Make a change
    const darkRadio = screen.getByLabelText(/Dark/);
    fireEvent.click(darkRadio);

    // Save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockManager.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
        })
      );
    });
  });

  it('should show success message after saving', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });

    const darkRadio = screen.getByLabelText(/Dark/);
    fireEvent.click(darkRadio);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully')).toBeInTheDocument();
    });
  });

  it('should show error message if save fails', async () => {
    (mockManager.updateSettings as any).mockRejectedValue(new Error('Save failed'));

    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });

    const darkRadio = screen.getByLabelText(/Dark/);
    fireEvent.click(darkRadio);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Save failed/)).toBeInTheDocument();
    });
  });

  it('should reset settings when reset button is clicked', async () => {
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(mockManager.resetSettings).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('should not reset if user cancels confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });

    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);

    expect(mockManager.resetSettings).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should show retry button if loading fails', async () => {
    (mockManager.getSettings as any).mockRejectedValue(new Error('Load failed'));

    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should retry loading when retry button is clicked', async () => {
    (mockManager.getSettings as any).mockRejectedValueOnce(new Error('Load failed'));
    (mockManager.getSettings as any).mockResolvedValueOnce(DEFAULT_SETTINGS);

    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load settings')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });
  });

  it('should navigate to all tabs', async () => {
    render(<SettingsView />);

    await waitFor(() => {
      expect(screen.getByText('General Settings')).toBeInTheDocument();
    });

    // Cache tab
    fireEvent.click(screen.getByText('Cache & Offline'));
    expect(screen.getByText('Cache & Offline Settings')).toBeInTheDocument();

    // Metadata tab
    fireEvent.click(screen.getByText('Local Metadata'));
    expect(screen.getByText('Local Metadata Settings')).toBeInTheDocument();

    // Performance tab
    fireEvent.click(screen.getByText('Performance'));
    expect(screen.getByText('Performance Settings')).toBeInTheDocument();

    // Privacy tab
    fireEvent.click(screen.getByText('Privacy'));
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();

    // Back to General
    fireEvent.click(screen.getByText('General'));
    expect(screen.getByText('General Settings')).toBeInTheDocument();
  });
});
