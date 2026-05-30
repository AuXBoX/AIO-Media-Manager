/**
 * Query key factory for React Query
 * Provides type-safe and consistent query keys across the application
 */

export interface QueryOptions {
  type?: string | number;
  sort?: string;
  filters?: Record<string, unknown>;
  offset?: number;
  limit?: number;
  titlesOnly?: boolean;
  musicViewMode?: 'artists' | 'albums';
}

export const queryKeys = {
  // Server and authentication
  servers: ['servers'] as const,
  user: (userId?: string) => ['user', userId] as const,
  homeUsers: ['homeUsers'] as const,

  // Libraries
  libraries: ['libraries'] as const,
  library: (id: string) => ['library', id] as const,
  libraryItems: (id: string, options?: QueryOptions) =>
    ['library', id, 'items', options] as const,
  libraryStats: (id: string) => ['library', id, 'stats'] as const,
  libraryFilters: (id: string) => ['library', id, 'filters'] as const,

  // Metadata
  metadata: (ratingKey: string) => ['metadata', ratingKey] as const,
  metadataChildren: (ratingKey: string) =>
    ['metadata', ratingKey, 'children'] as const,
  metadataGrandchildren: (ratingKey: string) =>
    ['metadata', ratingKey, 'grandchildren'] as const,
  metadataArtwork: (ratingKey: string) =>
    ['metadata', ratingKey, 'artwork'] as const,
  matchCandidates: (ratingKey: string) =>
    ['metadata', ratingKey, 'matches'] as const,

  // Playlists
  playlists: (type?: 'audio' | 'video') => ['playlists', type] as const,
  playlist: (playlistId: string) => ['playlist', playlistId] as const,
  playlistItems: (playlistId: string) =>
    ['playlist', playlistId, 'items'] as const,

  // Collections
  collections: (sectionId: string) => ['collections', sectionId] as const,
  collection: (collectionId: string) => ['collection', collectionId] as const,

  // Search
  search: (query: string, sectionId?: string) =>
    ['search', query, sectionId] as const,
  filterPresets: ['filterPresets'] as const,

  // Recently added/played
  recentlyAdded: (sectionId: string, type: string, limit: number) =>
    ['library', sectionId, 'recentlyAdded', type, limit] as const,
  recentlyPlayed: (sectionId: string, type: string, limit: number) =>
    ['library', sectionId, 'recentlyPlayed', type, limit] as const,
  onDeck: ['onDeck'] as const,

  // Hubs
  hubs: (sectionId?: string) => ['hubs', sectionId] as const,

  // External metadata
  externalSearch: (provider: string, query: string, type: string) =>
    ['external', provider, 'search', query, type] as const,
  externalDetails: (provider: string, externalId: string) =>
    ['external', provider, 'details', externalId] as const,

  // Batch operations
  operationStatus: (operationId: string) =>
    ['operation', operationId] as const,
  operationHistory: ['operationHistory'] as const,
} as const;
