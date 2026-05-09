import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocalMetadataSettings, LocalMetadataSettingsState } from './LocalMetadataSettings';

describe('LocalMetadataSettings', () => {
  const mockOnSave = vi.fn();

  const defaultSettings: LocalMetadataSettingsState = {
    saveMode: 'plex',
    localFormat: 'nfo',
    nfoTemplate: 'kodi',
    createBackups: true,
    autoSyncLocalChanges: false,
  };

  it('should render with default settings', () => {
    render(<LocalMetadataSettings onSave={mockOnSave} />);

    expect(screen.getByText('Local Metadata Settings')).toBeInTheDocument();
    expect(screen.getByLabelText(/Plex Only/i)).toBeChecked();
  });

  it('should render with initial settings', () => {
    const initialSettings: LocalMetadataSettingsState = {
      saveMode: 'both',
      localFormat: 'both',
      nfoTemplate: 'emby',
      createBackups: false,
      autoSyncLocalChanges: true,
    };

    render(<LocalMetadataSettings onSave={mockOnSave} initialSettings={initialSettings} />);

    expect(screen.getByLabelText(/Both - Save metadata to both/i)).toBeChecked();
    expect(screen.getByLabelText(/Both - NFO files and embedded tags/i)).toBeChecked();
  });

  it('should show local format options when local or both is selected', () => {
    render(<LocalMetadataSettings onSave={mockOnSave} />);

    // Initially hidden (Plex only)
    expect(screen.queryByText('Local Format')).not.toBeInTheDocument();

    // Select "Both"
    fireEvent.click(screen.getByLabelText(/Both - Save metadata to both/i));

    // Now visible
    expect(screen.getByText('Local Format')).toBeInTheDocument();
  });

  it('should show NFO template selector when NFO format is selected', () => {
    const initialSettings: LocalMetadataSettingsState = {
      ...defaultSettings,
      saveMode: 'local',
      localFormat: 'nfo',
    };

    render(<LocalMetadataSettings onSave={mockOnSave} initialSettings={initialSettings} />);

    expect(screen.getByText('NFO Template')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('kodi');
  });

  it('should hide NFO template selector when embedded only is selected', () => {
    const initialSettings: LocalMetadataSettingsState = {
      ...defaultSettings,
      saveMode: 'local',
      localFormat: 'embedded',
    };

    render(<LocalMetadataSettings onSave={mockOnSave} initialSettings={initialSettings} />);

    expect(screen.queryByText('NFO Template')).not.toBeInTheDocument();
  });

  it('should show backup option when local or both is selected', () => {
    const initialSettings: LocalMetadataSettingsState = {
      ...defaultSettings,
      saveMode: 'local',
    };

    render(<LocalMetadataSettings onSave={mockOnSave} initialSettings={initialSettings} />);

    expect(
      screen.getByLabelText(/Create backups before overwriting existing files/i)
    ).toBeInTheDocument();
  });

  it('should show auto-sync option when local or both is selected', () => {
    const initialSettings: LocalMetadataSettingsState = {
      ...defaultSettings,
      saveMode: 'both',
    };

    render(<LocalMetadataSettings onSave={mockOnSave} initialSettings={initialSettings} />);

    expect(
      screen.getByLabelText(/Automatically sync local changes to Plex/i)
    ).toBeInTheDocument();
  });

  it('should call onSave with updated settings', () => {
    render(<LocalMetadataSettings onSave={mockOnSave} />);

    // Change save mode to "both"
    fireEvent.click(screen.getByLabelText(/Both - Save metadata to both/i));

    // Change local format to "embedded" - use more specific selector
    const embeddedRadio = screen.getByRole('radio', { name: /Embedded Tags - ID3\/MP4 tags in media files/i });
    fireEvent.click(embeddedRadio);

    // Click save
    fireEvent.click(screen.getByText('Save Settings'));

    expect(mockOnSave).toHaveBeenCalledWith({
      saveMode: 'both',
      localFormat: 'embedded',
      nfoTemplate: 'kodi',
      createBackups: true,
      autoSyncLocalChanges: false,
    });
  });

  it('should update NFO template selection', () => {
    const initialSettings: LocalMetadataSettingsState = {
      ...defaultSettings,
      saveMode: 'local',
      localFormat: 'nfo',
    };

    render(<LocalMetadataSettings onSave={mockOnSave} initialSettings={initialSettings} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'emby' } });

    fireEvent.click(screen.getByText('Save Settings'));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        nfoTemplate: 'emby',
      })
    );
  });

  it('should toggle backup checkbox', () => {
    const initialSettings: LocalMetadataSettingsState = {
      ...defaultSettings,
      saveMode: 'local',
      createBackups: true,
    };

    render(<LocalMetadataSettings onSave={mockOnSave} initialSettings={initialSettings} />);

    const checkbox = screen.getByLabelText(/Create backups before overwriting existing files/i);
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    fireEvent.click(screen.getByText('Save Settings'));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        createBackups: false,
      })
    );
  });

  it('should toggle auto-sync checkbox', () => {
    const initialSettings: LocalMetadataSettingsState = {
      ...defaultSettings,
      saveMode: 'both',
      autoSyncLocalChanges: false,
    };

    render(<LocalMetadataSettings onSave={mockOnSave} initialSettings={initialSettings} />);

    const checkbox = screen.getByLabelText(/Automatically sync local changes to Plex/i);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);

    fireEvent.click(screen.getByText('Save Settings'));

    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        autoSyncLocalChanges: true,
      })
    );
  });
});
