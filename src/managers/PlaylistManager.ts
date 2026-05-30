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
 * Search result interface for library tracks
 */
export interface LibraryTrack {
  ratingKey: string;
  key: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  thumb?: string;
  parentThumb?: string;
  grandparentThumb?: string;
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

  // Cover art
  uploadCoverArt(playlistId: string, imageData: Blob | ArrayBuffer): Promise<void>;
  removeCoverArt(playlistId: string): Promise<void>;

  // Search
  searchLibraryTracks(sectionKey: string, query: string, artistHint?: string, titleHint?: string): Promise<LibraryTrack[]>;
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
   * Upload custom cover art for a playlist
   */
  async uploadCoverArt(playlistId: string, imageData: Blob | ArrayBuffer): Promise<void> {
    const formData = new FormData();
    const blob = imageData instanceof Blob ? imageData : new Blob([imageData], { type: 'image/jpeg' });
    formData.append('file', blob, 'cover.jpg');

    await this.client.post(`/library/metadata/${playlistId}/posters`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Remove custom cover art (revert to auto-generated composite)
   */
  async removeCoverArt(playlistId: string): Promise<void> {
    await this.client.delete(`/library/metadata/${playlistId}/posters`);
  }

  /**
   * Search library for tracks matching a query
   * Uses artist-first strategy ported from Playlist Lab for better results
   */
  async searchLibraryTracks(sectionKey: string, query: string, artistHint?: string, titleHint?: string): Promise<LibraryTrack[]> {
    console.log('[PlaylistManager] Searching for:', query, 'in library:', sectionKey, { artistHint, titleHint });
    
    const allResults: LibraryTrack[] = [];
    const seenKeys = new Set<string>();

    // Helper to add results without duplicates
    const addResults = (items: any[]) => {
      for (const item of items) {
        if (!seenKeys.has(item.ratingKey)) {
          seenKeys.add(item.ratingKey);
          allResults.push({
            ratingKey: item.ratingKey,
            key: item.key,
            title: item.title,
            artist: item.grandparentTitle || item.originalTitle || '',
            album: item.parentTitle || '',
            duration: item.duration || 0,
            thumb: item.thumb,
            parentThumb: item.parentThumb,
            grandparentThumb: item.grandparentThumb,
          });
        }
      }
    };

    // Normalize function for comparison
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Parse query into artist and title if no hints provided
    let searchArtist = artistHint || '';
    let searchTitle = titleHint || '';
    
    if (!searchArtist && !searchTitle) {
      // Try to parse "Artist - Title" format
      if (query.includes(' - ')) {
        const parts = query.split(' - ');
        searchArtist = parts[0]?.trim() || '';
        searchTitle = parts.slice(1).join(' - ').trim();
      } else {
        // Assume it's just a title or artist + title
        searchTitle = query;
      }
    }

    // Clean up search terms
    const cleanSearch = (s: string) => s
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2018\u2019\u201A\u201B\u0027\u0060\u00B4']/g, '')
      .replace(/[^\w\s\-]/g, ' ').replace(/\s+/g, ' ').trim();

    searchArtist = cleanSearch(searchArtist);
    searchTitle = cleanSearch(searchTitle);

    console.log('[PlaylistManager] Parsed search:', { searchArtist, searchTitle });

    // Strategy 1: Artist-first search (most efficient when artist exists)
    if (searchArtist && searchTitle) {
      try {
        console.log('[PlaylistManager] Strategy 1: Artist-first search');
        const artistResponse = await this.client.get<any>(
          `/library/sections/${sectionKey}/all`,
          { params: { type: 8, 'artist.title': searchArtist } }
        );
        
        const artists = artistResponse.MediaContainer?.Metadata || [];
        console.log('[PlaylistManager] Found', artists.length, 'artists matching:', searchArtist);
        
        if (artists.length > 0) {
          // Get tracks from the first matching artist
          const artistKey = artists[0].ratingKey;
          const tracksResponse = await this.client.get<any>(
            `/library/metadata/${artistKey}/allLeaves`,
            { params: { type: 10 } }
          );
          
          const artistTracks = tracksResponse.MediaContainer?.Metadata || [];
          console.log('[PlaylistManager] Artist has', artistTracks.length, 'tracks');
          
          // Filter tracks by title
          const normalizedSearchTitle = normalize(searchTitle);
          const matchingTracks = artistTracks.filter((track: any) => {
            const trackTitle = track.title || '';
            const normalizedTrackTitle = normalize(trackTitle);
            return normalizedTrackTitle.includes(normalizedSearchTitle) || 
                   normalizedSearchTitle.includes(normalizedTrackTitle);
          });
          
          console.log('[PlaylistManager] Filtered to', matchingTracks.length, 'matching tracks');
          addResults(matchingTracks);
        }
      } catch (error) {
        console.error('[PlaylistManager] Artist-first search failed:', error);
      }
    }

    // Strategy 2: Direct filter with artist.title and track.title
    if (allResults.length === 0 && searchArtist && searchTitle) {
      try {
        console.log('[PlaylistManager] Strategy 2: Direct filter search');
        const response = await this.client.get<any>(
          `/library/sections/${sectionKey}/all`,
          { params: { type: 10, 'artist.title': searchArtist, 'track.title': searchTitle } }
        );
        const items = response.MediaContainer?.Metadata || [];
        console.log('[PlaylistManager] Direct filter found', items.length, 'results');
        addResults(items);
      } catch (error) {
        console.error('[PlaylistManager] Direct filter search failed:', error);
      }
    }

    // Strategy 3: Track title only search
    if (allResults.length === 0 && searchTitle) {
      try {
        console.log('[PlaylistManager] Strategy 3: Title-only search');
        const response = await this.client.get<any>(
          `/library/sections/${sectionKey}/all`,
          { params: { type: 10, 'track.title': searchTitle } }
        );
        const items = response.MediaContainer?.Metadata || [];
        console.log('[PlaylistManager] Title-only search found', items.length, 'results');
        addResults(items);
      } catch (error) {
        console.error('[PlaylistManager] Title-only search failed:', error);
      }
    }

    // Strategy 4: Hub search (free-text across all fields)
    if (allResults.length === 0) {
      try {
        console.log('[PlaylistManager] Strategy 4: Hub search fallback');
        const hubQuery = [searchArtist, searchTitle].filter(Boolean).join(' ');
        const response = await this.client.get<any>(
          `/library/sections/${sectionKey}/all`,
          { params: { type: 10, title: hubQuery } }
        );
        const items = response.MediaContainer?.Metadata || [];
        console.log('[PlaylistManager] Hub search found', items.length, 'results');
        addResults(items);
      } catch (error) {
        console.error('[PlaylistManager] Hub search failed:', error);
      }
    }

    // Strategy 5: Try artist with hyphen replaced by space
    if (allResults.length === 0 && searchArtist && searchArtist.includes('-')) {
      const artistVariant = searchArtist.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
      if (artistVariant !== searchArtist) {
        try {
          console.log('[PlaylistManager] Strategy 5: Artist variant search:', artistVariant);
          const response = await this.client.get<any>(
            `/library/sections/${sectionKey}/all`,
            { params: { type: 10, 'artist.title': artistVariant, 'track.title': searchTitle } }
          );
          const items = response.MediaContainer?.Metadata || [];
          console.log('[PlaylistManager] Artist variant search found', items.length, 'results');
          addResults(items);
        } catch (error) {
          console.error('[PlaylistManager] Artist variant search failed:', error);
        }
      }
    }

    console.log('[PlaylistManager] Total unique results:', allResults.length);
    return allResults;
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
