import Dexie, { Table } from 'dexie';

/**
 * Database schema interfaces
 */

export interface MetadataRecord {
  ratingKey: string; // Primary key
  sectionId: string;
  type: string;
  data: unknown;
  cachedAt: number;
  lastModified: number;
  dirty: boolean; // Has offline changes
}

export interface ArtworkRecord {
  url: string; // Primary key
  blob: Blob;
  mimeType: string;
  size: number;
  cachedAt: number;
}

export interface LibrarySectionRecord {
  key: string; // Primary key
  data: unknown;
  cachedAt: number;
  itemCount: number;
}

export interface OfflineChangeRecord {
  id: string; // Primary key (UUID)
  timestamp: number;
  type: 'update' | 'match' | 'artwork';
  ratingKey: string;
  data: unknown;
  synced: boolean;
  error?: string;
}

export interface UserPreferenceRecord {
  key: string; // Primary key
  value: unknown;
  updatedAt: number;
}

export interface FilterPresetRecord {
  id: string; // Primary key (UUID)
  name: string;
  criteria: unknown;
  createdAt: number;
  updatedAt: number;
}

export interface OperationHistoryRecord {
  id: string; // Primary key (UUID)
  type: string;
  total: number;
  succeeded: number;
  failed: number;
  startedAt: number;
  completedAt: number;
  errors: Array<{ ratingKey: string; error: string }>;
}

/**
 * AIO Media Manager Database
 */
export class AIOMediaManagerDB extends Dexie {
  // Declare tables
  metadata!: Table<MetadataRecord, string>;
  artwork!: Table<ArtworkRecord, string>;
  librarySections!: Table<LibrarySectionRecord, string>;
  offlineChanges!: Table<OfflineChangeRecord, string>;
  userPreferences!: Table<UserPreferenceRecord, string>;
  filterPresets!: Table<FilterPresetRecord, string>;
  operationHistory!: Table<OperationHistoryRecord, string>;

  constructor() {
    super('aio-media-manager');

    // Define database schema
    this.version(1).stores({
      metadata: 'ratingKey, sectionId, type, cachedAt, dirty',
      artwork: 'url, cachedAt',
      librarySections: 'key, cachedAt',
      offlineChanges: 'id, timestamp, ratingKey, synced',
      userPreferences: 'key, updatedAt',
      filterPresets: 'id, createdAt, updatedAt',
      operationHistory: 'id, startedAt, completedAt',
    });
  }
}

// Create and export database instance
export const db = new AIOMediaManagerDB();
