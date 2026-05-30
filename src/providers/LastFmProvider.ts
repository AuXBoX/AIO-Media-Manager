import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * Last.fm API Configuration
 */
interface LastFmConfig {
  baseURL?: string;
  apiKey?: string;
}

/**
 * Last.fm API Response Types
 */
interface LastFmImage {
  '#text': string;
  size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega';
}

interface LastFmTag {
  name: string;
  url: string;
}

interface LastFmArtist {
  name: string;
  mbid?: string;
  url: string;
  image?: LastFmImage[];
  listeners?: string;
  playcount?: string;
  bio?: {
    summary?: string;
    content?: string;
  };
  tags?: {
    tag?: LastFmTag[];
  };
  similar?: {
    artist?: LastFmArtist[];
  };
}

interface LastFmAlbum {
  name: string;
  artist: string | { name: string; mbid?: string };
  mbid?: string;
  url: string;
  image?: LastFmImage[];
  listeners?: string;
  playcount?: string;
  tags?: {
    tag?: LastFmTag[];
  };
  tracks?: {
    track?: Array<{
      name: string;
      duration: number;
      '@attr'?: { rank: number };
    }>;
  };
  wiki?: {
    summary?: string;
    content?: string;
  };
}

interface LastFmTrack {
  name: string;
  artist: { name: string; mbid?: string };
  album?: { title: string; image?: LastFmImage[] };
  mbid?: string;
  url: string;
  duration?: string;
  listeners?: string;
  playcount?: string;
  toptags?: {
    tag?: LastFmTag[];
  };
  wiki?: {
    summary?: string;
    content?: string;
  };
}

/**
 * Last.fm Provider
 * 
 * Provides metadata from Last.fm
 * Supports artists, albums, and tracks with genres/tags and images
 */
export class LastFmProvider extends BaseExternalMetadataProvider {
  readonly provider = 'lastfm' as const;
  private client: AxiosInstance;
  private apiKey: string;

  constructor(plexClient: PlexClient, config: LastFmConfig = {}) {
    super(plexClient);

    this.apiKey = config.apiKey || '';

    this.client = axios.create({
      baseURL: config.baseURL || 'https://ws.audioscrobbler.com/2.0',
      params: {
        api_key: this.apiKey,
        format: 'json',
      },
    });
  }

  /**
   * Search for artists, albums, or tracks
   */
  async search(query: string, type: MediaType, year?: number): Promise<SearchResult[]> {
    switch (type) {
      case 'artist':
        return this.searchArtists(query);
      case 'album':
        return this.searchAlbums(query);
      case 'track':
        return this.searchTracks(query);
      default:
        throw new Error(`Last.fm does not support media type: ${type}`);
    }
  }

  /**
   * Get detailed metadata
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    // External ID format: "artist-{name}", "album-{artist}-{album}", or "track-{artist}-{track}"
    const separatorIndex = externalId.indexOf('-');
    if (separatorIndex === -1) {
      throw new Error(`Invalid Last.fm external ID format: ${externalId}`);
    }

    const entityType = externalId.substring(0, separatorIndex);
    const idPart = externalId.substring(separatorIndex + 1);

    switch (entityType) {
      case 'artist':
        return this.getArtistDetails(idPart);
      case 'album': {
        // Format: "album-{artist}--{album}"
        const parts = idPart.split('--');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          throw new Error(`Invalid Last.fm album ID format: ${externalId}`);
        }
        return this.getAlbumDetails(parts[0], parts[1]);
      }
      case 'track': {
        // Format: "track-{artist}--{track}"
        const parts = idPart.split('--');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          throw new Error(`Invalid Last.fm track ID format: ${externalId}`);
        }
        return this.getTrackDetails(parts[0], parts[1]);
      }
      default:
        throw new Error(`Invalid Last.fm external ID format: ${externalId}`);
    }
  }

  /**
   * Search for artists
   */
  private async searchArtists(query: string): Promise<SearchResult[]> {
    const response = await this.client.get<{
      results: { artistmatches: { artist: LastFmArtist[] } };
    }>('', {
      params: { method: 'artist.search', artist: query, limit: 25 },
    });

    const artists = response.data?.results?.artistmatches?.artist || [];
    return artists.map((artist) => ({
      externalId: `artist-${artist.name}`,
      title: artist.name,
      provider: 'lastfm' as const,
      thumb: this.getLargestImage(artist.image),
    }));
  }

  /**
   * Search for albums
   */
  private async searchAlbums(query: string): Promise<SearchResult[]> {
    const response = await this.client.get<{
      results: { albummatches: { album: LastFmAlbum[] } };
    }>('', {
      params: { method: 'album.search', album: query, limit: 25 },
    });

    const albums = response.data?.results?.albummatches?.album || [];
    return albums.map((album) => {
      const artistName = typeof album.artist === 'string' ? album.artist : album.artist?.name || '';
      return {
        externalId: `album-${artistName}--${album.name}`,
        title: album.name,
        summary: artistName,
        provider: 'lastfm' as const,
        thumb: this.getLargestImage(album.image),
      };
    });
  }

  /**
   * Search for tracks
   */
  private async searchTracks(query: string): Promise<SearchResult[]> {
    const response = await this.client.get<{
      results: { trackmatches: { track: LastFmTrack[] } };
    }>('', {
      params: { method: 'track.search', track: query, limit: 25 },
    });

    const tracks = response.data?.results?.trackmatches?.track || [];
    return tracks.map((track) => ({
      externalId: `track-${track.artist?.name}--${track.name}`,
      title: track.name,
      summary: track.artist?.name,
      provider: 'lastfm' as const,
    }));
  }

  /**
   * Get artist details
   */
  private async getArtistDetails(name: string): Promise<ExternalMetadata> {
    const response = await this.client.get<{ artist: LastFmArtist }>('', {
      params: { method: 'artist.getInfo', artist: name },
    });

    const artist = response.data?.artist;
    if (!artist) {
      throw new Error(`Artist not found: ${name}`);
    }

    const genres = artist.tags?.tag?.map((t) => t.name) || [];
    const images = artist.image
      ?.map((img) => img['#text'])
      .filter((url) => url && url.length > 0) || [];

    return {
      externalId: `artist-${artist.name}`,
      title: artist.name,
      summary: artist.bio?.summary?.replace(/<[^>]*>/g, '').trim(),
      genres: genres.length > 0 ? genres : undefined,
      posters: images.length > 0 ? images : undefined,
      provider: 'lastfm',
    };
  }

  /**
   * Get album details
   */
  private async getAlbumDetails(artist: string, album: string): Promise<ExternalMetadata> {
    const response = await this.client.get<{ album: LastFmAlbum }>('', {
      params: { method: 'album.getInfo', artist, album },
    });

    const albumData = response.data?.album;
    if (!albumData) {
      throw new Error(`Album not found: ${artist} - ${album}`);
    }

    const genres = albumData.tags?.tag?.map((t) => t.name) || [];
    const images = albumData.image
      ?.map((img) => img['#text'])
      .filter((url) => url && url.length > 0) || [];

    return {
      externalId: `album-${artist}--${album}`,
      title: albumData.name,
      summary: albumData.wiki?.summary?.replace(/<[^>]*>/g, '').trim(),
      genres: genres.length > 0 ? genres : undefined,
      posters: images.length > 0 ? images : undefined,
      provider: 'lastfm',
    };
  }

  /**
   * Get track details
   */
  private async getTrackDetails(artist: string, track: string): Promise<ExternalMetadata> {
    const response = await this.client.get<{ track: LastFmTrack }>('', {
      params: { method: 'track.getInfo', artist, track },
    });

    const trackData = response.data?.track;
    if (!trackData) {
      throw new Error(`Track not found: ${artist} - ${track}`);
    }

    const genres = trackData.toptags?.tag?.map((t) => t.name) || [];
    const albumImages = trackData.album?.image
      ?.map((img) => img['#text'])
      .filter((url) => url && url.length > 0) || [];

    return {
      externalId: `track-${artist}--${track}`,
      title: trackData.name,
      runtime: trackData.duration ? Math.floor(parseInt(trackData.duration) / 1000) : undefined,
      summary: trackData.wiki?.summary?.replace(/<[^>]*>/g, '').trim(),
      genres: genres.length > 0 ? genres : undefined,
      posters: albumImages.length > 0 ? albumImages : undefined,
      provider: 'lastfm',
    };
  }

  /**
   * Get the largest available image URL from Last.fm image array
   */
  private getLargestImage(images?: LastFmImage[]): string | undefined {
    if (!images || images.length === 0) return undefined;
    
    // Prefer larger sizes: mega > extralarge > large > medium > small
    const sizePriority: Array<LastFmImage['size']> = ['mega', 'extralarge', 'large', 'medium', 'small'];
    for (const size of sizePriority) {
      const img = images.find((i) => i.size === size && i['#text']);
      if (img) return img['#text'];
    }
    return images[0]?.['#text'] || undefined;
  }
}

/**
 * Create a Last.fm provider instance
 */
export function createLastFmProvider(plexClient: PlexClient, apiKey: string): LastFmProvider {
  return new LastFmProvider(plexClient, { apiKey });
}
