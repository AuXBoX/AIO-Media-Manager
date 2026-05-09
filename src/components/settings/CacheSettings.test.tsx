import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CacheSettings } from './CacheSettings';
import { DEFAULT_SETTINGS } from '@/managers/SettingsManager';

describe('CacheSettings', () => {
  const mockOnSave = vi.fn();

  const defaultProps = {
    settings: DEFAULT_SETTINGS,
    onSave: mockOnSave,
    saving: false,
  };

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it('should render cache settings', () => {
    render(<CacheSettings {...defaultProps} />);

    expect(screen.getByText('Cache & Offline Settings')).toBeInTheDocument();
    expect(screen.getByText('Enable Caching')).toBeInTheDocument();
  });

  it('should display cache enabled checkbox', () => {
    render(<CacheSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Caching');
    expect(checkbox).toBeChecked();
  });

  it('should toggle cache enabled', () => {
    render(<CacheSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Caching');
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should show cache options when caching is enabled', () => {
    render(<CacheSettings {...defaultProps} />);

    expect(screen.getByText(/Maximum Cache Size:/)).toBeInTheDocument();
    expect(screen.getByText(/Cache Retention:/)).toBeInTheDocument();
    expect(screen.getByText(/Auto-Clear Interval:/)).toBeInTheDocument();
  });

  it('should hide cache options when caching is disabled', () => {
    const disabledSettings = {
      ...DEFAULT_SETTINGS,
      cacheEnabled: false,
    };

    render(<CacheSettings {...defaultProps} settings={disabledSettings} />);

    expect(screen.queryByText(/Maximum Cache Size:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cache Retention:/)).not.toBeInTheDocument();
  });

  it('should change max cache size', () => {
    render(<CacheSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Maximum Cache Size:/);
    fireEvent.change(slider, { target: { value: '2048' } });

    expect(slider).toHaveValue('2048');
    expect(screen.getByText('Maximum Cache Size: 2048 MB')).toBeInTheDocument();
  });

  it('should change cache retention days', () => {
    render(<CacheSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Cache Retention:/);
    fireEvent.change(slider, { target: { value: '60' } });

    expect(slider).toHaveValue('60');
    expect(screen.getByText('Cache Retention: 60 days')).toBeInTheDocument();
  });

  it('should change auto-clear interval', () => {
    render(<CacheSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Auto-Clear Interval:/);
    fireEvent.change(slider, { target: { value: '14' } });

    expect(slider).toHaveValue('14');
    expect(screen.getByText('Auto-Clear Interval: Every 14 days')).toBeInTheDocument();
  });

  it('should display offline mode checkbox', () => {
    render(<CacheSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Offline Mode');
    expect(checkbox).toBeChecked();
  });

  it('should toggle offline mode', () => {
    render(<CacheSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Offline Mode');
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should show auto sync options when offline mode is enabled', () => {
    render(<CacheSettings {...defaultProps} />);

    expect(screen.getByText('Automatic Synchronization')).toBeInTheDocument();
    expect(screen.getByText(/Sync Interval:/)).toBeInTheDocument();
  });

  it('should hide auto sync options when offline mode is disabled', () => {
    const disabledSettings = {
      ...DEFAULT_SETTINGS,
      offlineModeEnabled: false,
    };

    render(<CacheSettings {...defaultProps} settings={disabledSettings} />);

    expect(screen.queryByText('Automatic Synchronization')).not.toBeInTheDocument();
  });

  it('should toggle auto sync', () => {
    render(<CacheSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Automatic Synchronization');
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should change sync interval', () => {
    render(<CacheSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Sync Interval:/);
    fireEvent.change(slider, { target: { value: '30' } });

    expect(slider).toHaveValue('30');
    expect(screen.getByText('Sync Interval: Every 30 minutes')).toBeInTheDocument();
  });

  it('should hide sync interval when auto sync is disabled', () => {
    const disabledSettings = {
      ...DEFAULT_SETTINGS,
      autoSync: false,
    };

    render(<CacheSettings {...defaultProps} settings={disabledSettings} />);

    expect(screen.queryByText(/Sync Interval:/)).not.toBeInTheDocument();
  });

  it('should show save and cancel buttons when changes are made', () => {
    render(<CacheSettings {...defaultProps} />);

    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();

    const checkbox = screen.getByLabelText('Enable Caching');
    fireEvent.click(checkbox);

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onSave with updated settings', async () => {
    render(<CacheSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Maximum Cache Size:/);
    fireEvent.change(slider, { target: { value: '2048' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          maxCacheSize: 2048,
        })
      );
    });
  });

  it('should reset changes when cancel is clicked', () => {
    render(<CacheSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Caching');
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(checkbox).toBeChecked();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('should disable buttons when saving', () => {
    render(<CacheSettings {...defaultProps} saving={true} />);

    const checkbox = screen.getByLabelText('Enable Caching');
    fireEvent.click(checkbox);

    const saveButton = screen.getByText('Saving...');
    const cancelButton = screen.getByText('Cancel');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should save multiple changes at once', async () => {
    render(<CacheSettings {...defaultProps} />);

    const cacheCheckbox = screen.getByLabelText('Enable Caching');
    fireEvent.click(cacheCheckbox);

    const offlineCheckbox = screen.getByLabelText('Enable Offline Mode');
    fireEvent.click(offlineCheckbox);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheEnabled: false,
          offlineModeEnabled: false,
        })
      );
    });
  });
});
