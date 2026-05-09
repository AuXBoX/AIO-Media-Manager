import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaylistManager } from './PlaylistManager';
import { PlexClient } from '@/api/plexClient';

// Mock PlexClient
vi.mock('@/api/plexClient');

describe('PlaylistManager', () => {
  let manager: PlaylistManager;
  let mockClient: PlexClient;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as any;

    manager = new PlaylistManager(mockClient);
  });

  describe('getPlaylists', () => {
    it('should fetch audio playlists', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              key: '/playlists/123',
              title: 'My Favorites',
              playlistType: 'audio',
              smart: false,
              leafCount: 50,
              duration: 180000,
              addedAt: 1234567890,
              updatedAt: 1234567890,
              type: 'playlist',
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const playlists = await manager.getPlaylists('audio');

      expect(mockClient.get).toHaveBeenCalledWith('/playlists', {
        params: { playlistType: 'audio' },
      });
      expect(playlists).toHaveLength(1);
      expect(playlists[0]?.title).toBe('My Favorites');
      expect(playlists[0]?.playlistType).toBe('audio');
    });

    it('should fetch video playlists', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '456',
              key: '/playlists/456',
              title: 'Movie Marathon',
              playlistType: 'video',
              smart: false,
              leafCount: 10,
              duration: 720000,
              addedAt: 1234567890,
              updatedAt: 1234567890,
              type: 'playlist',
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const playlists = await manager.getPlaylists('video');

      expect(mockClient.get).toHaveBeenCalledWith('/playlists', {
        params: { playlistType: 'video' },
      });
      expect(playlists).toHaveLength(1);
      expect(playlists[0]?.playlistType).toBe('video');
    });

    it('should return empty array when no playlists exist', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const playlists = await manager.getPlaylists('audio');

      expect(playlists).toEqual([]);
    });
  });

  describe('getPlaylist', () => {
    it('should fetch a specific playlist', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '123',
              key: '/playlists/123',
              title: 'My Favorites',
              playlistType: 'audio',
              smart: false,
              leafCount: 50,
              duration: 180000,
              addedAt: 1234567890,
              updatedAt: 1234567890,
              type: 'playlist',
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const playlist = await manager.getPlaylist('123');

      expect(mockClient.get).toHaveBeenCalledWith('/playlists/123');
      expect(playlist.title).toBe('My Favorites');
      expect(playlist.ratingKey).toBe('123');
    });

    it('should throw error when playlist not found', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      await expect(manager.getPlaylist('999')).rejects.toThrow('Playlist not found: 999');
    });
  });

  describe('createPlaylist', () => {
    it('should create a new audio playlist', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '789',
              key: '/playlists/789',
              title: 'New Playlist',
              playlistType: 'audio',
              smart: false,
              leafCount: 0,
              duration: 0,
              addedAt: 1234567890,
              updatedAt: 1234567890,
              type: 'playlist',
            },
          ],
        },
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      const playlist = await manager.createPlaylist(
        'New Playlist',
        'audio',
        'server://library/sections/1'
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        '/playlists',
        null,
        {
          params: {
            type: 'audio',
            title: 'New Playlist',
            smart: 0,
            uri: 'server://library/sections/1',
          },
        }
      );
      expect(playlist.title).toBe('New Playlist');
      expect(playlist.playlistType).toBe('audio');
    });

    it('should throw error when creation fails', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.post).mockResolvedValue(mockResponse);

      await expect(
        manager.createPlaylist('Test', 'audio', 'server://library/sections/1')
      ).rejects.toThrow('Failed to create playlist');
    });
  });

  describe('deletePlaylist', () => {
    it('should delete a playlist', async () => {
      vi.mocked(mockClient.delete).mockResolvedValue(undefined);

      await manager.deletePlaylist('123');

      expect(mockClient.delete).toHaveBeenCalledWith('/playlists/123');
    });
  });

  describe('updatePlaylist', () => {
    it('should update playlist title', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.updatePlaylist('123', { title: 'Updated Title' });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/playlists/123',
        null,
        {
          params: { title: 'Updated Title' },
        }
      );
    });

    it('should update playlist summary', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.updatePlaylist('123', { summary: 'New description' });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/playlists/123',
        null,
        {
          params: { summary: 'New description' },
        }
      );
    });

    it('should update multiple fields', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.updatePlaylist('123', {
        title: 'New Title',
        summary: 'New description',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        '/playlists/123',
        null,
        {
          params: {
            title: 'New Title',
            summary: 'New description',
          },
        }
      );
    });
  });

  describe('getPlaylistItems', () => {
    it('should fetch items in a playlist', async () => {
      const mockResponse = {
        MediaContainer: {
          Metadata: [
            {
              ratingKey: '456',
              key: '/library/metadata/456',
              guid: 'plex://track/456',
              type: 'track',
              title: 'Song Title',
              addedAt: 1234567890,
              updatedAt: 1234567890,
            },
            {
              ratingKey: '789',
              key: '/library/metadata/789',
              guid: 'plex://track/789',
              type: 'track',
              title: 'Another Song',
              addedAt: 1234567890,
              updatedAt: 1234567890,
            },
          ],
        },
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const items = await manager.getPlaylistItems('123');

      expect(mockClient.get).toHaveBeenCalledWith('/playlists/123/items');
      expect(items).toHaveLength(2);
      expect(items[0]?.title).toBe('Song Title');
      expect(items[1]?.title).toBe('Another Song');
    });

    it('should return empty array when playlist has no items', async () => {
      const mockResponse = {
        MediaContainer: {},
      };

      vi.mocked(mockClient.get).mockResolvedValue(mockResponse);

      const items = await manager.getPlaylistItems('123');

      expect(items).toEqual([]);
    });
  });

  describe('addToPlaylist', () => {
    it('should add single item to playlist', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.addToPlaylist('123', ['server://library/metadata/456']);

      expect(mockClient.put).toHaveBeenCalledWith(
        '/playlists/123/items',
        null,
        {
          params: { uri: 'server://library/metadata/456' },
        }
      );
    });

    it('should add multiple items to playlist', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.addToPlaylist('123', [
        'server://library/metadata/456',
        'server://library/metadata/789',
      ]);

      expect(mockClient.put).toHaveBeenCalledWith(
        '/playlists/123/items',
        null,
        {
          params: {
            uri: 'server://library/metadata/456,server://library/metadata/789',
          },
        }
      );
    });
  });

  describe('removeFromPlaylist', () => {
    it('should remove item from playlist', async () => {
      vi.mocked(mockClient.delete).mockResolvedValue(undefined);

      await manager.removeFromPlaylist('123', '456');

      expect(mockClient.delete).toHaveBeenCalledWith('/playlists/123/items/456');
    });
  });

  describe('moveInPlaylist', () => {
    it('should move item in playlist', async () => {
      vi.mocked(mockClient.put).mockResolvedValue(undefined);

      await manager.moveInPlaylist('123', '456', '789');

      expect(mockClient.put).toHaveBeenCalledWith(
        '/playlists/123/items/456/move',
        null,
        {
          params: { after: '789' },
        }
      );
    });
  });
});
