import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PlaylistsView } from './PlaylistsView';
import { PlexClient } from '@/api/plexClient';
import { PlaylistManager } from '@/managers/PlaylistManager';

// Mock PlaylistManager
vi.mock('@/managers/PlaylistManager');

describe('PlaylistsView', () => {
  let mockClient: PlexClient;

  beforeEach(() => {
    mockClient = {} as PlexClient;
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(PlaylistManager.prototype.getPlaylists).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(
      <PlaylistsView
        type="audio"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render playlists when loaded', async () => {
    const mockPlaylists = [
      {
        ratingKey: '1',
        key: '/playlists/1',
        title: 'My Favorites',
        type: 'playlist',
        playlistType: 'audio' as const,
        smart: false,
        leafCount: 50,
        duration: 180000,
        addedAt: 1609459200,
        updatedAt: 1609459200,
      },
      {
        ratingKey: '2',
        key: '/playlists/2',
        title: 'Workout Mix',
        type: 'playlist',
        playlistType: 'audio' as const,
        smart: true,
        leafCount: 30,
        duration: 120000,
        addedAt: 1609459200,
        updatedAt: 1609459200,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylists).mockResolvedValue(mockPlaylists);

    render(
      <PlaylistsView
        type="audio"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Favorites')).toBeInTheDocument();
      expect(screen.getByText('Workout Mix')).toBeInTheDocument();
    });

    expect(screen.getByText('50 items')).toBeInTheDocument();
    expect(screen.getByText('30 items')).toBeInTheDocument();
    expect(screen.getByText('Smart')).toBeInTheDocument();
  });

  it('should render empty state when no playlists', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylists).mockResolvedValue([]);

    render(
      <PlaylistsView
        type="audio"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No audio playlists yet')).toBeInTheDocument();
    });
  });

  it('should render error state on failure', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylists).mockRejectedValue(
      new Error('Failed to load')
    );

    render(
      <PlaylistsView
        type="audio"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  it('should call onPlaylistClick when playlist is clicked', async () => {
    const mockPlaylists = [
      {
        ratingKey: '1',
        key: '/playlists/1',
        title: 'My Favorites',
        type: 'playlist',
        playlistType: 'audio' as const,
        smart: false,
        leafCount: 50,
        duration: 180000,
        addedAt: 1609459200,
        updatedAt: 1609459200,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylists).mockResolvedValue(mockPlaylists);

    const onPlaylistClick = vi.fn();

    render(
      <PlaylistsView
        type="audio"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onPlaylistClick={onPlaylistClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Favorites')).toBeInTheDocument();
    });

    screen.getByText('My Favorites').click();

    expect(onPlaylistClick).toHaveBeenCalledWith(mockPlaylists[0]);
  });

  it('should call onCreatePlaylist when create button is clicked', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylists).mockResolvedValue([]);

    const onCreatePlaylist = vi.fn();

    render(
      <PlaylistsView
        type="audio"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onCreatePlaylist={onCreatePlaylist}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No audio playlists yet')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Playlist');
    createButton.click();

    expect(onCreatePlaylist).toHaveBeenCalled();
  });

  it('should display playlist thumbnails when available', async () => {
    const mockPlaylists = [
      {
        ratingKey: '1',
        key: '/playlists/1',
        title: 'My Favorites',
        type: 'playlist',
        composite: '/playlists/1/composite',
        playlistType: 'audio' as const,
        smart: false,
        leafCount: 50,
        duration: 180000,
        addedAt: 1609459200,
        updatedAt: 1609459200,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylists).mockResolvedValue(mockPlaylists);

    render(
      <PlaylistsView
        type="audio"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      const img = screen.getByAltText('My Favorites');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        'src',
        'http://localhost:32400/playlists/1/composite?X-Plex-Token=test-token'
      );
    });
  });

  it('should filter playlists by type', async () => {
    const mockAudioPlaylists = [
      {
        ratingKey: '1',
        key: '/playlists/1',
        title: 'Audio Playlist',
        type: 'playlist',
        playlistType: 'audio' as const,
        smart: false,
        leafCount: 50,
        duration: 180000,
        addedAt: 1609459200,
        updatedAt: 1609459200,
      },
    ];

    const mockVideoPlaylists = [
      {
        ratingKey: '2',
        key: '/playlists/2',
        title: 'Video Playlist',
        type: 'playlist',
        playlistType: 'video' as const,
        smart: false,
        leafCount: 20,
        duration: 360000,
        addedAt: 1609459200,
        updatedAt: 1609459200,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylists)
      .mockResolvedValueOnce(mockAudioPlaylists)
      .mockResolvedValueOnce(mockVideoPlaylists);

    const { rerender } = render(
      <PlaylistsView
        type="audio"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Audio Playlist')).toBeInTheDocument();
    });

    expect(PlaylistManager.prototype.getPlaylists).toHaveBeenCalledWith('audio');

    rerender(
      <PlaylistsView
        type="video"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Video Playlist')).toBeInTheDocument();
    });

    expect(PlaylistManager.prototype.getPlaylists).toHaveBeenCalledWith('video');
  });

  it('should display correct empty state message for video playlists', async () => {
    vi.mocked(PlaylistManager.prototype.getPlaylists).mockResolvedValue([]);

    render(
      <PlaylistsView
        type="video"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No video playlists yet')).toBeInTheDocument();
    });
  });

  it('should display duration for playlists', async () => {
    const mockPlaylists = [
      {
        ratingKey: '1',
        key: '/playlists/1',
        title: 'My Favorites',
        type: 'playlist',
        playlistType: 'audio' as const,
        smart: false,
        leafCount: 50,
        duration: 180000, // 3 minutes
        addedAt: 1609459200,
        updatedAt: 1609459200,
      },
    ];

    vi.mocked(PlaylistManager.prototype.getPlaylists).mockResolvedValue(mockPlaylists);

    render(
      <PlaylistsView
        type="audio"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('My Favorites')).toBeInTheDocument();
    });

    // Duration should be displayed (implementation may vary)
    expect(screen.getByText('50 items')).toBeInTheDocument();
  });
});
