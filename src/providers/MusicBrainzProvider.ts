import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * MusicBrainz API Configuration
 */
interface MusicBrainzConfig {
  baseURL?: string;
  userAgent?: string;
}

/**
 * MusicBrainz API Response Types
 */
interface MusicBrainzArtist {
  id: string;
  name: string;
  'sort-name'?: string;
  disambiguation?: string;
  type?: string;
  'life-span'?: {
    begin?: string;
    end?: string;
  };
  country?: string;
  tags?: Array<{ name: string; count: number }>;
}

interface MusicBrainzRelease {
  id: string;
  title: string;
  date?: string;
  'artist-credit'?: Array<{
    name: string;
    artist: MusicBrainzArtist;
  }>;
  'release-group'?: {
    id: string;
    'primary-type'?: string;
    'secondary-types'?: string[];
  };
  media?: Array<{
    format?: string;
    'track-count'?: number;
    tracks?: Array<{
      id: string;
      title: string;
      length?: number;
      position: number;
    }>;
  }>;
}

interface MusicBrainzRecording {
  id: string;
  title: string;
  length?: number;
  'artist-credit'?: Array<{
    name: string;
    artist: MusicBrainzArtist;
  }>;
  releases?: MusicBrainzRelease[];
}

/**
 * MusicBrainz Provider
 * 
 * Provides metadata from MusicBrainz
 * Supports artists, albums, and tracks
 */
export class MusicBrainzProvider extends BaseExternalMetadataProvider {
  readonly provider = 'musicbrainz' as const;
  private client: AxiosInstance;

  constructor(plexClient: PlexClient, config: MusicBrainzConfig = {}) {
    super(plexClient);

    this.client = axios.create({
      baseURL: config.baseURL || 'https://musicbrainz.org/ws/2',
      headers: {
        'User-Agent': config.userAgent || 'AIO-Media-Manager/1.0.0',
        'Accept': 'application/json',
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
        return this.searchReleases(query, year);
      case 'track':
        return this.searchRecordings(query);
      default:
        throw new Error(`MusicBrainz does not support media type: ${type}`);
    }
  }

  /**
   * Get detailed metadata
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    // External ID format: "artist-{mbid}", "release-{mbid}", or "recording-{mbid}"
    const separatorIndex = externalId.indexOf('-');
    if (separatorIndex === -1) {
      throw new Error(`Invalid MusicBrainz external ID format: ${externalId}`);
    }

    const entityType = externalId.substring(0, separatorIndex);
    const mbid = externalId.substring(separatorIndex + 1);

    switch (entityType) {
      case 'artist':
        return this.getArtistDetails(mbid);
      case 'release':
        return this.getReleaseDetails(mbid);
      case 'recording':
        return this.getRecordingDetails(mbid);
      default:
        throw new Error(`Invalid MusicBrainz external ID format: ${externalId}`);
    }
  }

  /**
   * Search for artists
   */
  private async searchArtists(query: string): Promise<SearchResult[]> {
    const response = await this.client.get<{ artists: MusicBrainzArtist[] }>('/artist', {
      params: {
        query,
        fmt: 'json',
        limit: 25,
      },
    });

    return (response.data.artists || []).map((artist) => ({
      externalId: `artist-${artist.id}`,
      title: artist.name,
      originalTitle: artist['sort-name'],
      summary: artist.disambiguation,
      provider: 'musicbrainz' as const,
    }));
  }

  /**
   * Search for releases (albums)
   */
  private async searchReleases(query: string, year?: number): Promise<SearchResult[]> {
    const searchQuery = year ? `${query} AND date:${year}` : query;

    const response = await this.client.get<{ releases: MusicBrainzRelease[] }>('/release', {
      params: {
        query: searchQuery,
        fmt: 'json',
        limit: 25,
      },
    });

    return (response.data.releases || []).map((release) => ({
      externalId: `release-${release.id}`,
      title: release.title,
      year: release.date ? parseInt(release.date.substring(0, 4), 10) : undefined,
      summary: release['artist-credit']?.[0]?.name,
      provider: 'musicbrainz' as const,
    }));
  }

  /**
   * Search for recordings (tracks)
   */
  private async searchRecordings(query: string): Promise<SearchResult[]> {
    const response = await this.client.get<{ recordings: MusicBrainzRecording[] }>(
      '/recording',
      {
        params: {
          query,
          fmt: 'json',
          limit: 25,
        },
      }
    );

    return (response.data.recordings || []).map((recording) => ({
      externalId: `recording-${recording.id}`,
      title: recording.title,
      summary: recording['artist-credit']?.[0]?.name,
      provider: 'musicbrainz' as const,
    }));
  }

  /**
   * Get artist details
   */
  private async getArtistDetails(mbid: string): Promise<ExternalMetadata> {
    const response = await this.client.get<MusicBrainzArtist>(`/artist/${mbid}`, {
      params: {
        inc: 'tags',
        fmt: 'json',
      },
    });

    const artist = response.data;

    return {
      externalId: `artist-${artist.id}`,
      title: artist.name,
      originalTitle: artist['sort-name'],
      summary: artist.disambiguation,
      genres: artist.tags?.map((tag) => tag.name),
      provider: 'musicbrainz',
    };
  }

  /**
   * Get release (album) details
   */
  private async getReleaseDetails(mbid: string): Promise<ExternalMetadata> {
    const response = await this.client.get<MusicBrainzRelease>(`/release/${mbid}`, {
      params: {
        inc: 'artist-credits+recordings',
        fmt: 'json',
      },
    });

    const release = response.data;
    const year = release.date ? parseInt(release.date.substring(0, 4), 10) : undefined;

    return {
      externalId: `release-${release.id}`,
      title: release.title,
      year,
      releaseDate: release.date,
      genres: release['release-group']?.['primary-type']
        ? [release['release-group']['primary-type']]
        : undefined,
      provider: 'musicbrainz',
    };
  }

  /**
   * Get recording (track) details
   */
  private async getRecordingDetails(mbid: string): Promise<ExternalMetadata> {
    const response = await this.client.get<MusicBrainzRecording>(`/recording/${mbid}`, {
      params: {
        inc: 'artist-credits+releases',
        fmt: 'json',
      },
    });

    const recording = response.data;

    return {
      externalId: `recording-${recording.id}`,
      title: recording.title,
      runtime: recording.length ? Math.floor(recording.length / 1000) : undefined,
      provider: 'musicbrainz',
    };
  }
}

/**
 * Create a MusicBrainz provider instance
 */
export function createMusicBrainzProvider(plexClient: PlexClient): MusicBrainzProvider {
  return new MusicBrainzProvider(plexClient);
}
