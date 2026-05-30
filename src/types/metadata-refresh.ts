/**
 * Enhanced Metadata Refresh Types
 * 
 * Types for the multi-step metadata refresh workflow with search confirmation,
 * detailed review, and comprehensive data selection.
 */

import type { LibraryItem } from '@/managers/LibraryManager';
import type { ExternalMetadata } from './index';

/**
 * Workflow status for metadata refresh process
 */
export type RefreshWorkflowStatus =
  | 'options'           // Select what to refresh
  | 'searching'         // Searching for matches
  | 'match-review'      // Confirm search matches
  | 'fetching-details'  // Fetching full metadata
  | 'detail-review'     // Review all fetched data
  | 'applying'          // Applying changes
  | 'completed'         // Done
  | 'error';            // Error occurred

/**
 * Search result from external provider
 */
export interface SearchResult {
  externalId: string;
  title: string;
  originalTitle?: string;
  year?: number;
  rating?: number;
  summary?: string;
  poster?: string;
  backdrop?: string;
  provider: 'tmdb' | 'tvdb' | 'imdb' | 'musicbrainz' | 'lastfm' | 'discogs' | 'albumartexchange' | 'fanart' | 'itunes';
  genres?: string[];
}

/**
 * Image with selection state
 */
export interface SelectableImage {
  url: string;
  width?: number;
  height?: number;
  selected: boolean;
  aspectRatio?: string;
  language?: string;
}

/**
 * Collection of fetched images
 */
export interface FetchedImages {
  posters: SelectableImage[];
  backgrounds: SelectableImage[];
  logos?: SelectableImage[];
  banners?: SelectableImage[];
}

/**
 * Trailer with selection state
 */
export interface FetchedTrailer {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration: string;
  quality: string[];
  selectedQuality?: string; // User-selected quality for download
  channelName: string;
  publishedAt: string;
  viewCount: number;
  isOfficial: boolean;
  isStudioChannel: boolean;
  score: number;
  selected: boolean;
}

/**
 * Cast member with selection state
 */
export interface SelectableCastMember {
  name: string;
  character?: string;
  profilePath?: string;
  order: number;
  selected: boolean;
}

/**
 * Crew member with selection state
 */
export interface SelectableCrewMember {
  name: string;
  job: string;
  department: string;
  profilePath?: string;
  selected: boolean;
}

/**
 * Editable metadata fields
 */
export interface EditableMetadata {
  title: string;
  originalTitle?: string;
  sortTitle?: string;
  year?: number;
  rating?: number;
  contentRating?: string;
  studio?: string;
  tagline?: string;
  summary?: string;
  runtime?: number;
  genres: string[];
  tags: string[];
  directors: string[];
  writers: string[];
  producers: string[];
}

/**
 * Complete review item with all fetched data
 */
export interface EnhancedReviewItem {
  // Original item
  item: LibraryItem;
  
  // Search results
  searchResults: SearchResult[];
  selectedResultIndex: number;
  
  // Editable metadata
  metadata: EditableMetadata;
  
  // Original metadata for comparison
  originalMetadata: EditableMetadata;
  
  // Images
  images: FetchedImages;
  
  // Trailers
  trailers: FetchedTrailer[];
  
  // Cast & Crew
  cast: SelectableCastMember[];
  crew: SelectableCrewMember[];
  
  // External metadata reference
  externalMetadata?: ExternalMetadata;
  
  // Status
  error?: string;
  selected: boolean;
  hasChanges: boolean;
}

/**
 * Refresh options
 */
export interface RefreshOptions {
  refreshMetadata: boolean;
  refreshImages: boolean;
  refreshTrailers: boolean;
  refreshCast: boolean;
  refreshCrew: boolean;
  saveLocally: boolean;
  downloadImages: boolean;
  downloadTrailers: boolean;
  preferredTrailerQuality: '2160p' | '1080p' | '720p' | '480p' | '360p';
  maxTrailersPerItem: number;
}

/**
 * Progress tracking
 */
export interface RefreshProgress {
  status: RefreshWorkflowStatus;
  currentStep: number;
  totalSteps: number;
  currentItem: string;
  currentItemIndex: number;
  totalItems: number;
  errors: Array<{ item: string; error: string; step: string }>;
  warnings: Array<{ item: string; warning: string }>;
}

/**
 * Match confirmation for an item
 */
export interface MatchConfirmation {
  itemIndex: number;
  selectedResultIndex: number;
  confirmed: boolean;
  skipped: boolean;
  customSearch?: string;
}
