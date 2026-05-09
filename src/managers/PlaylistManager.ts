import { PlexClient } from '@/api/plexClient';
import type { MetadataItem } from './MetadataManager';

/**
 * Playlist interface
 */
export interface Playlist {
  ratingKey: string;
  key: string;
  title: string;
  summary?: string;
  composite?: string;
  playlistType: 'audio' | 'video';
  smart: boolean;
  leafCount: number;
  duration: number;
  addedAt: number;
  updatedAt: number;
  guid?: string;
  type: string;
  [key: string]: any;
}

/**
 * Playlist update interface
 */
export interface PlaylistUpdate {
  title?: string;
  summary?: string;
}

/**
 * Playlist Manager Interface
 */
export interface IPlaylistManager {
  // Playlists
  getPlaylists(type: 'audio' | 'video'): Promise<Playlist[]>;
  getPlaylist(playlistId: string): Promise<Playlist>;
  createPlaylist(title: string, type: 'audio' | 'video', libraryUri: string): Promise<Playlist>;
  deletePlaylist(playlistId: string): Promise<void>;
  updatePlaylist(playlistId: string, updates: PlaylistUpdate): Promise<void>;

  // Items
  getPlaylistItems(playlistId: string): Promise<MetadataItem[]>;
  addToPlaylist(playlistId: string, itemUris: string[]): Promise<void>;
  removeFromPlaylist(playlistId: string, playlistItemId: string): Promise<void>;
  moveInPlaylist(playlistId: string, playlistItemId: string, afterItemId: string): Promise<void>;
}

/**
 * Playlist Manager Implementation
 * Handles playlist management operations
 */
export class PlaylistManager implements IPlaylistManager {
  constructor(private client: PlexClient) {}

  /**
   * Get all playlists of a specific type
   */
  async getPlaylists(type: 'audio' | 'video'): Promise<Playlist[]> {
    const response = await this.client.get<any>('/playlists', {
      params: { playlistType: type },
    });

    const playlists = response.MediaContainer?.Metadata || [];
    return playlists.map((playlist: any) => this.mapPlaylist(playlist));
  }

  /**
   * Get a specific playlist by ID
   */
  async getPlaylist(playlistId: string): Promise<Playlist> {
    const response = await this.client.get<any>(`/playlists/${playlistId}`);

    if (!response?.MediaContainer?.Metadata?.[0]) {
      throw new Error(`Playlist not found: ${playlistId}`);
    }

    return this.mapPlaylist(response.MediaContainer.Metadata[0]);
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(
    title: string,
    type: 'audio' | 'video',
    libraryUri: string
  ): Promise<Playlist> {
    const response = await this.client.post<any>(
      '/playlists',
      null,
      {
        params: {
          type,
          title,
          smart: 0,
          uri: libraryUri,
        },
      }
    );

    if (!response?.MediaContainer?.Metadata?.[0]) {
      throw new Error('Failed to create playlist');
    }

    return this.mapPlaylist(response.MediaContainer.Metadata[0]);
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(playlistId: string): Promise<void> {
    await this.client.delete(`/playlists/${playlistId}`);
  }

  /**
   * Update playlist metadata
   */
  async updatePlaylist(playlistId: string, updates: PlaylistUpdate): Promise<void> {
    const params: any = {};

    if (updates.title !== undefined) {
      params.title = updates.title;
    }

    if (updates.summary !== undefined) {
      params.summary = updates.summary;
    }

    await this.client.put(`/playlists/${playlistId}`, null, { params });
  }

  /**
   * Get items in a playlist
   */
  async getPlaylistItems(playlistId: string): Promise<MetadataItem[]> {
    const response = await this.client.get<any>(`/playlists/${playlistId}/items`);

    const items = response.MediaContainer?.Metadata || [];
    return items.map((item: any) => this.mapMetadataItem(item));
  }

  /**
   * Add items to a playlist
   */
  async addToPlaylist(playlistId: string, itemUris: string[]): Promise<void> {
    // Join URIs with comma
    const uri = itemUris.join(',');

    await this.client.put(`/playlists/${playlistId}/items`, null, {
      params: { uri },
    });
  }

  /**
   * Remove an item from a playlist
   */
  async removeFromPlaylist(playlistId: string, playlistItemId: string): Promise<void> {
    await this.client.delete(`/playlists/${playlistId}/items/${playlistItemId}`);
  }

  /**
   * Move an item within a playlist
   */
  async moveInPlaylist(
    playlistId: string,
    playlistItemId: string,
    afterItemId: string
  ): Promise<void> {
    await this.client.put(
      `/playlists/${playlistId}/items/${playlistItemId}/move`,
      null,
      {
        params: { after: afterItemId },
      }
    );
  }

  /**
   * Map Plex playlist response to Playlist interface
   */
  private mapPlaylist(playlist: any): Playlist {
    return {
      ratingKey: playlist.ratingKey,
      key: playlist.key,
      title: playlist.title,
      summary: playlist.summary,
      composite: playlist.composite,
      playlistType: playlist.playlistType,
      smart: playlist.smart === 1 || playlist.smart === true,
      leafCount: playlist.leafCount || 0,
      duration: playlist.duration || 0,
      addedAt: playlist.addedAt,
      updatedAt: playlist.updatedAt,
      guid: playlist.guid,
      type: playlist.type,
      ...playlist,
    };
  }

  /**
   * Map Plex metadata item to MetadataItem interface
   */
  private mapMetadataItem(item: any): MetadataItem {
    return {
      ratingKey: item.ratingKey,
      key: item.key,
      guid: item.guid,
      type: item.type,
      title: item.title,
      originalTitle: item.originalTitle,
      summary: item.summary,
      tagline: item.tagline,
      rating: item.rating,
      year: item.year,
      thumb: item.thumb,
      art: item.art,
      duration: item.duration,
      addedAt: item.addedAt,
      updatedAt: item.updatedAt,
      studio: item.studio,
      contentRating: item.contentRating,
      genres: item.Genre?.map((g: any) => ({ tag: g.tag, id: g.id })),
      roles: item.Role?.map((r: any) => ({ tag: r.tag, role: r.role, thumb: r.thumb, id: r.id })),
      directors: item.Director?.map((d: any) => ({ tag: d.tag, id: d.id })),
      writers: item.Writer?.map((w: any) => ({ tag: w.tag, id: w.id })),
      index: item.index,
      parentIndex: item.parentIndex,
      parentRatingKey: item.parentRatingKey,
      grandparentRatingKey: item.grandparentRatingKey,
      parentTitle: item.parentTitle,
      grandparentTitle: item.grandparentTitle,
      Media: item.Media?.map((m: any) => ({
        id: m.id,
        duration: m.duration,
        bitrate: m.bitrate,
        width: m.width,
        height: m.height,
        aspectRatio: m.aspectRatio,
        audioChannels: m.audioChannels,
        audioCodec: m.audioCodec,
        videoCodec: m.videoCodec,
        container: m.container,
        videoResolution: m.videoResolution,
        Part: m.Part?.map((p: any) => ({
          id: p.id,
          key: p.key,
          duration: p.duration,
          file: p.file,
          size: p.size,
          container: p.container,
        })),
      })),
      viewCount: item.viewCount,
      lastViewedAt: item.lastViewedAt,
      userRating: item.userRating,
      ...item,
    };
  }
}

/**
 * Create a Playlist Manager instance
 */
export function createPlaylistManager(client: PlexClient): PlaylistManager {
  return new PlaylistManager(client);
}
