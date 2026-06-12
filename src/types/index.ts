/**
 * Core type definitions for AIO Media Manager
 */

export type MediaType =
  | 'movie'
  | 'show'
  | 'season'
  | 'episode'
  | 'artist'
  | 'album'
  | 'track';

export interface PlexServer {
  machineIdentifier: string;
  name: string;
  version: string;
  connections: ServerConnection[];
  owned: boolean;
  home: boolean;
}

export interface ServerConnection {
  protocol: 'http' | 'https';
  address: string;
  port: number;
  local: boolean;
  relay: boolean;
  uri: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email: string;
  thumb: string;
  isAdmin: boolean;
  isRestricted: boolean;
}

/**
 * External Metadata Provider Types
 */

export type ExternalProvider = 'tmdb' | 'imdb' | 'tvdb' | 'musicbrainz' | 'discogs' | 'fanart' | 'lastfm' | 'albumartexchange' | 'itunes' | 'plex';

export interface SearchResult {
  externalId: string;
  title: string;
  originalTitle?: string;
  year?: number;
  thumb?: string;
  summary?: string;
  provider: ExternalProvider;
}

export interface ExternalMetadata {
  externalId: string;
  title: string;
  originalTitle?: string;
  summary?: string;
  tagline?: string;
  rating?: number;
  year?: number;
  releaseDate?: string;
  runtime?: number;
  genres?: string[];
  cast?: ExternalCast[];
  crew?: ExternalCrew[];
  posters?: string[];
  backdrops?: string[];
  provider: ExternalProvider;
}

export interface ExternalCast {
  name: string;
  character: string;
  profilePath?: string;
  order: number;
}

export interface ExternalCrew {
  name: string;
  job: string;
  department: string;
  profilePath?: string;
}

/**
 * Enhanced Metadata Refresh Types
 */
export * from './metadata-refresh';
