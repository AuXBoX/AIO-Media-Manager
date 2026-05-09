import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaylistEditor } from './PlaylistEditor';
import { PlexClient } from '@/api/plexClient';
import { PlaylistManager } from '@/managers/PlaylistManager';
import type { Playlist } from '@/managers/PlaylistManager';
import type { MetadataItem } from '@/managers/MetadataManager';

// Mock PlaylistManager
vi.mock('@/managers/PlaylistManager');

describe('PlaylistEditor', () => {
  let mockClient: PlexClient;
  let mockPlaylist: Playlist;
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnSave: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockClient = {} as PlexClient;
    mockPlaylist = {
      ratingKey: '123',
      key: '/playlists/123',
      title: 'My Favorites',
      summary: 'My favorite songs',
      playlistType: 'audio',
      smart: false,
      leafCount: 50,
      duration: 180000,
      addedAt: 1609459200,
      updatedAt: 1609459200,
      type: 'playlist',
    };
    mockOnClose = vi.fn();
    mockOnSave = vi.fn();
    vi.clearAllMocks();
  });

  it('should render playlist editor with initial values', async () => {
    const mockItems: MetadataItem[] = [
      {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://track/456',
        type: 'track',
        title: 'Song 1',
        addedAt: 1609459200,
        updatedAt: 1609459200,
        playlistItemID: 1,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue(mockItems);

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Favorites')).toBeInTheDocument();
      expect(screen.getByDisplayValue('My favorite songs')).toBeInTheDocument();
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });
  });

  it('should update title when input changes', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue([]);

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Favorites')).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue('My Favorites');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Playlist');

    expect(screen.getByDisplayValue('Updated Playlist')).toBeInTheDocument();
  });

  it('should save playlist when save button is clicked', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue([]);
    vi.mocked(PlaylistManager.prototype.updatePlaylist).mockResolvedValue(undefined);

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Favorites')).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue('My Favorites');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Playlist');

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(PlaylistManager.prototype.updatePlaylist).toHaveBeenCalledWith('123', {
        title: 'Updated Playlist',
        summary: 'My favorite songs',
      });
      expect(mockOnSave).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should close editor when cancel button is clicked', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue([]);

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should delete playlist when delete button is clicked and confirmed', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue([]);
    vi.mocked(PlaylistManager.prototype.deletePlaylist).mockResolvedValue(undefined);

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Delete Playlist')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete Playlist');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(PlaylistManager.prototype.deletePlaylist).toHaveBeenCalledWith('123');
      expect(mockOnSave).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });

  it('should not delete playlist when delete is cancelled', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue([]);

    // Mock window.confirm to return false
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Delete Playlist')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete Playlist');
    await user.click(deleteButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(PlaylistManager.prototype.deletePlaylist).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it('should display error when save fails', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue([]);
    vi.mocked(PlaylistManager.prototype.updatePlaylist).mockRejectedValue(
      new Error('Save failed')
    );

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should disable save button when title is empty', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue([]);

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Favorites')).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue('My Favorites');
    await user.clear(titleInput);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('should display smart playlist badge', async () => {
    const smartPlaylist = { ...mockPlaylist, smart: true };
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue([]);

    render(
      <PlaylistEditor
        playlist={smartPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Smart Playlist')).toBeInTheDocument();
    });
  });

  it('should remove item from playlist when remove button is clicked', async () => {
    const mockItems: MetadataItem[] = [
      {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://track/456',
        type: 'track',
        title: 'Song 1',
        addedAt: 1609459200,
        updatedAt: 1609459200,
        playlistItemID: 1,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylistItems)
      .mockResolvedValueOnce(mockItems)
      .mockResolvedValueOnce([]);
    vi.mocked(PlaylistManager.prototype.removeFromPlaylist).mockResolvedValue(undefined);

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByTitle('Remove from playlist');
    await user.click(removeButtons[0]!);

    await waitFor(() => {
      expect(PlaylistManager.prototype.removeFromPlaylist).toHaveBeenCalledWith('123', '1');
    });
  });

  it('should display empty state when playlist has no items', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue([]);

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No items in this playlist')).toBeInTheDocument();
    });
  });

  it('should format duration correctly', async () => {
    const mockItems: MetadataItem[] = [
      {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://track/456',
        type: 'track',
        title: 'Short Song',
        duration: 125000, // 2:05
        addedAt: 1609459200,
        updatedAt: 1609459200,
        playlistItemID: 1,
      },
      {
        ratingKey: '457',
        key: '/library/metadata/457',
        guid: 'plex://track/457',
        type: 'track',
        title: 'Long Song',
        duration: 3725000, // 1:02:05
        addedAt: 1609459200,
        updatedAt: 1609459200,
        playlistItemID: 2,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue(mockItems);

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('2:05')).toBeInTheDocument();
      expect(screen.getByText('1:02:05')).toBeInTheDocument();
    });
  });

  it('should disable drag-and-drop for smart playlists', async () => {
    const smartPlaylist = { ...mockPlaylist, smart: true };
    const mockItems: MetadataItem[] = [
      {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://track/456',
        type: 'track',
        title: 'Song 1',
        addedAt: 1609459200,
        updatedAt: 1609459200,
        playlistItemID: 1,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue(mockItems);

    render(
      <PlaylistEditor
        playlist={smartPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });

    // Smart playlists should not show remove buttons
    const removeButtons = screen.queryAllByTitle('Remove from playlist');
    expect(removeButtons).toHaveLength(0);
  });

  it('should display loading state when fetching items', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  it('should display error when loading items fails', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockRejectedValue(
      new Error('Failed to load items')
    );

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load items')).toBeInTheDocument();
    });
  });

  it('should display error when removing item fails', async () => {
    const mockItems: MetadataItem[] = [
      {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://track/456',
        type: 'track',
        title: 'Song 1',
        addedAt: 1609459200,
        updatedAt: 1609459200,
        playlistItemID: 1,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue(mockItems);
    vi.mocked(PlaylistManager.prototype.removeFromPlaylist).mockRejectedValue(
      new Error('Failed to remove item')
    );

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByTitle('Remove from playlist');
    await user.click(removeButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Failed to remove item')).toBeInTheDocument();
    });
  });

  it('should display error when item has no playlistItemID', async () => {
    const mockItems: MetadataItem[] = [
      {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://track/456',
        type: 'track',
        title: 'Song 1',
        addedAt: 1609459200,
        updatedAt: 1609459200,
        // Missing playlistItemID
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue(mockItems);

    const user = userEvent.setup();

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Song 1')).toBeInTheDocument();
    });

    const removeButtons = screen.getAllByTitle('Remove from playlist');
    await user.click(removeButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Cannot remove item: missing playlist item ID')).toBeInTheDocument();
    });
  });

  it('should display parent and grandparent titles', async () => {
    const mockItems: MetadataItem[] = [
      {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://track/456',
        type: 'track',
        title: 'Track Title',
        parentTitle: 'Album Title',
        grandparentTitle: 'Artist Name',
        addedAt: 1609459200,
        updatedAt: 1609459200,
        playlistItemID: 1,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue(mockItems);

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Track Title')).toBeInTheDocument();
      expect(screen.getByText('Artist Name')).toBeInTheDocument();
    });
  });

  it('should display item thumbnails when available', async () => {
    const mockItems: MetadataItem[] = [
      {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://track/456',
        type: 'track',
        title: 'Song 1',
        thumb: '/library/metadata/456/thumb',
        addedAt: 1609459200,
        updatedAt: 1609459200,
        playlistItemID: 1,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylistItems).mockResolvedValue(mockItems);

    render(
      <PlaylistEditor
        playlist={mockPlaylist}
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    await waitFor(() => {
      const img = screen.getByAltText('Song 1');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        'src',
        'http://localhost:32400/library/metadata/456/thumb?X-Plex-Token=test-token'
      );
    });
  });
});
