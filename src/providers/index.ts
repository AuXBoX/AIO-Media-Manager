/**
 * External Metadata Providers
 * 
 * This module provides interfaces and implementations for external metadata providers
 * (TMDB, IMDB, TVDB, MusicBrainz, Discogs, Fanart.tv) that allow searching and 
 * importing metadata from external sources.
 * 
 * Also includes YouTube trailer provider for scraping and downloading trailers.
 */

export type {
  IExternalMetadataProvider,
} from './ExternalMetadataProvider';

export { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

export { TMDBProvider, createTMDBProvider } from './TMDBProvider';
export { IMDBProvider, createIMDBProvider } from './IMDBProvider';
export { TVDBProvider, createTVDBProvider } from './TVDBProvider';
export { MusicBrainzProvider, createMusicBrainzProvider } from './MusicBrainzProvider';
export { DiscogsProvider, createDiscogsProvider } from './DiscogsProvider';
export { FanartProvider, createFanartProvider } from './FanartProvider';
export { LastFmProvider, createLastFmProvider } from './LastFmProvider';
export { AlbumArtExchangeProvider, createAlbumArtExchangeProvider } from './AlbumArtExchangeProvider';
export { ITunesProvider, createITunesProvider } from './ITunesProvider';

export {
  YouTubeTrailerProvider,
  createYouTubeTrailerProvider,
  type YouTubeTrailer,
  type TrailerSearchOptions,
} from './YouTubeTrailerProvider';

export {
  ProviderRegistry,
  createProviderRegistry,
  type ProviderConfig,
} from './ProviderRegistry';
