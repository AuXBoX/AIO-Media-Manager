# Design Document: Plex Media Manager

## Overview

The Plex Media Manager is a cross-platform desktop and web application that provides comprehensive metadata management capabilities for Plex Media Server libraries. The application enables users to view, edit, and organize metadata for movies, TV shows, and music, with support for both individual and bulk operations. It features offline caching for working without server connectivity, multi-user support for Plex Home environments, and integration with external metadata providers (TMDB, IMDB, MusicBrainz).

### Key Features

- **Server Connection**: PIN-based OAuth authentication with automatic server discovery
- **Multi-User Support**: Full Plex Home integration with per-user contexts
- **Metadata Management**: View and edit metadata for movies, TV shows, and music
- **Bulk Operations**: Efficient batch editing, matching, and artwork management
- **Offline Mode**: Local caching with automatic synchronization
- **External Integration**: Search and import from TMDB, IMDB, and MusicBrainz
- **Collections & Playlists**: Create and manage collections and playlists
- **Responsive UI**: Adaptive interface for desktop and tablet devices

### Target Platforms

- **Desktop**: Electron-based application for Windows, macOS, and Linux
- **Web**: Progressive Web App (PWA) for browser-based access
- **Minimum Requirements**: 1280x720 resolution, modern browser with ES2020 support


## Architecture

### High-Level Architecture

The application follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  (React Components, UI State Management, Routing)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                   Application Layer                          │
│  (Business Logic, Workflows, Validation)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                    Service Layer                             │
│  (API Clients, Cache Manager, Sync Engine)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                  Infrastructure Layer                        │
│  (Storage, Network, Platform APIs)                           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend Framework**
- React 18+ with TypeScript for type safety
- React Router for navigation
- TanStack Query (React Query) for server state management
- Zustand for client state management
- Tailwind CSS for styling

**Desktop Platform**
- Electron for cross-platform desktop support
- electron-store for persistent settings
- electron-updater for automatic updates

**Data Layer**
- IndexedDB for offline metadata cache (via Dexie.js)
- LocalStorage for user preferences and settings
- In-memory cache for frequently accessed data

**API Integration**
- Axios for HTTP requests with interceptors
- Custom Plex API client with retry logic
- TMDB, IMDB, and MusicBrainz API clients

**Build & Development**
- Vite for fast development and optimized builds
- Vitest for unit testing
- Playwright for end-to-end testing

### Architectural Patterns

**Repository Pattern**
- Abstract data access behind repository interfaces
- Repositories handle both API and cache access
- Automatic fallback to cache when server unavailable

**Command Pattern**
- Encapsulate operations (edit, match, refresh) as commands
- Support undo/redo for metadata changes
- Enable batch operation queuing

**Observer Pattern**
- Event-driven synchronization between cache and server
- Real-time updates via Plex WebSocket notifications
- UI reactivity through React Query invalidation

**Strategy Pattern**
- Pluggable metadata providers (TMDB, IMDB, MusicBrainz)
- Configurable sync strategies (immediate, scheduled, manual)
- Flexible image transcoding strategies


## Components and Interfaces

### Core Components

#### 1. Authentication Manager

**Responsibilities:**
- Handle PIN-based OAuth flow with Plex.tv
- Manage authentication tokens for multiple users
- Validate and refresh tokens
- Secure token storage

**Interface:**
```typescript
interface AuthenticationManager {
  // PIN-based OAuth flow
  generatePin(): Promise<PinResponse>;
  pollPinStatus(pinId: string, code: string): Promise<AuthToken | null>;
  
  // Token management
  validateToken(token: string): Promise<boolean>;
  refreshToken(token: string): Promise<string>;
  storeToken(userId: string, token: string): Promise<void>;
  getToken(userId: string): Promise<string | null>;
  clearTokens(): Promise<void>;
  
  // User info
  getUserInfo(token: string): Promise<UserInfo>;
  getHomeUsers(adminToken: string): Promise<HomeUser[]>;
  switchUser(adminToken: string, userId: string): Promise<AuthToken>;
}

interface PinResponse {
  id: number;
  code: string;
  expiresAt: string;
}

interface AuthToken {
  token: string;
  expiresAt?: string;
}

interface UserInfo {
  id: string;
  username: string;
  email: string;
  thumb: string;
  isAdmin: boolean;
  isRestricted: boolean;
}

interface HomeUser {
  id: string;
  title: string;
  username?: string;
  thumb: string;
  admin: boolean;
  restricted: boolean;
}
```

#### 2. Server Manager

**Responsibilities:**
- Discover available Plex servers
- Manage server connections (local, remote, relay)
- Test server connectivity
- Handle connection failover

**Interface:**
```typescript
interface ServerManager {
  // Server discovery
  discoverServers(token: string): Promise<PlexServer[]>;
  selectServer(serverId: string): Promise<void>;
  getCurrentServer(): PlexServer | null;
  
  // Connection management
  testConnection(server: PlexServer): Promise<ConnectionResult>;
  getOptimalConnection(server: PlexServer): Promise<ServerConnection>;
  
  // Server info
  getServerInfo(connection: ServerConnection): Promise<ServerInfo>;
  getServerCapabilities(connection: ServerConnection): Promise<ServerCapabilities>;
}

interface PlexServer {
  machineIdentifier: string;
  name: string;
  version: string;
  connections: ServerConnection[];
  owned: boolean;
  home: boolean;
}

interface ServerConnection {
  protocol: 'http' | 'https';
  address: string;
  port: number;
  local: boolean;
  relay: boolean;
  uri: string;
}

interface ConnectionResult {
  success: boolean;
  latency: number;
  error?: string;
}

interface ServerInfo {
  machineIdentifier: string;
  version: string;
  platform: string;
  platformVersion: string;
  transcoderAudio: boolean;
  musicAnalysis: number;
  sync: boolean;
}

interface ServerCapabilities {
  transcoderAudio: boolean;
  musicAnalysis: boolean;
  sync: boolean;
  timeline: boolean;
  playqueue: boolean;
}
```

#### 3. Library Manager

**Responsibilities:**
- Retrieve and cache library sections
- Navigate library hierarchies
- Manage library metadata
- Handle pagination

**Interface:**
```typescript
interface LibraryManager {
  // Library sections
  getLibrarySections(): Promise<LibrarySection[]>;
  getLibrarySection(sectionId: string): Promise<LibrarySection>;
  refreshLibrary(sectionId: string): Promise<void>;
  
  // Library items
  getLibraryItems(sectionId: string, options: QueryOptions): Promise<PaginatedResult<MetadataItem>>;
  getRecentlyAdded(sectionId: string, type: MediaType, limit: number): Promise<MetadataItem[]>;
  getRecentlyPlayed(sectionId: string, type: MediaType, limit: number): Promise<MetadataItem[]>;
  getOnDeck(): Promise<MetadataItem[]>;
  
  // Library statistics
  getLibraryStats(sectionId: string): Promise<LibraryStats>;
  getLibraryFilters(sectionId: string): Promise<FilterDefinition[]>;
}

interface LibrarySection {
  key: string;
  title: string;
  type: 'movie' | 'show' | 'artist';
  agent: string;
  scanner: string;
  language: string;
  uuid: string;
  updatedAt: number;
  createdAt: number;
  scannedAt: number;
  refreshing: boolean;
}

interface QueryOptions {
  type?: MediaType;
  sort?: string;
  filters?: Record<string, any>;
  offset?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  items: T[];
  offset: number;
  size: number;
  totalSize: number;
}

interface LibraryStats {
  totalItems: number;
  totalSize: number;
  averageFileSize: number;
  missingPosters: number;
  missingSummaries: number;
  resolutionDistribution: Record<string, number>;
  codecDistribution: Record<string, number>;
}

interface FilterDefinition {
  key: string;
  title: string;
  type: 'string' | 'integer' | 'boolean' | 'date' | 'tag';
  values?: FilterValue[];
}

interface FilterValue {
  key: string;
  title: string;
  count?: number;
}
```

#### 4. Metadata Manager

**Responsibilities:**
- Retrieve metadata for items
- Edit individual and bulk metadata
- Match and unmatch items
- Manage artwork

**Interface:**
```typescript
interface MetadataManager {
  // Metadata retrieval
  getMetadata(ratingKey: string): Promise<MetadataItem>;
  getChildren(ratingKey: string): Promise<MetadataItem[]>;
  getGrandchildren(ratingKey: string): Promise<MetadataItem[]>;
  
  // Metadata editing
  updateMetadata(ratingKey: string, updates: MetadataUpdate): Promise<void>;
  bulkUpdateMetadata(ratingKeys: string[], updates: MetadataUpdate): Promise<BulkOperationResult>;
  
  // Matching
  matchMetadata(ratingKey: string, guid: string): Promise<void>;
  unmatchMetadata(ratingKey: string): Promise<void>;
  getMatchCandidates(ratingKey: string): Promise<MatchCandidate[]>;
  bulkMatch(ratingKeys: string[]): Promise<BulkOperationResult>;
  
  // Artwork
  getArtwork(ratingKey: string): Promise<ArtworkAsset[]>;
  uploadArtwork(ratingKey: string, file: File, type: ArtworkType): Promise<void>;
  selectArtwork(ratingKey: string, url: string, type: ArtworkType): Promise<void>;
  deleteArtwork(ratingKey: string, type: ArtworkType): Promise<void>;
  
  // Refresh
  refreshMetadata(ratingKey: string): Promise<void>;
  bulkRefresh(ratingKeys: string[]): Promise<BulkOperationResult>;
}

interface MetadataItem {
  ratingKey: string;
  key: string;
  guid: string;
  type: MediaType;
  title: string;
  originalTitle?: string;
  summary?: string;
  tagline?: string;
  rating?: number;
  year?: number;
  thumb?: string;
  art?: string;
  duration?: number;
  addedAt: number;
  updatedAt: number;
  
  // Type-specific fields
  studio?: string;
  contentRating?: string;
  genres?: Tag[];
  roles?: Role[];
  directors?: Tag[];
  writers?: Tag[];
  
  // TV-specific
  index?: number;
  parentIndex?: number;
  parentRatingKey?: string;
  grandparentRatingKey?: string;
  
  // Music-specific
  parentTitle?: string;
  grandparentTitle?: string;
  
  // Media info
  media?: MediaInfo[];
  
  // User data
  viewCount?: number;
  lastViewedAt?: number;
  userRating?: number;
}

interface MetadataUpdate {
  title?: string;
  originalTitle?: string;
  summary?: string;
  tagline?: string;
  rating?: number;
  year?: number;
  studio?: string;
  contentRating?: string;
  genres?: string[];
  roles?: RoleUpdate[];
  directors?: string[];
  writers?: string[];
}

interface RoleUpdate {
  tag: string;
  role?: string;
  thumb?: string;
}

interface MatchCandidate {
  guid: string;
  score: number;
  title: string;
  year?: number;
  thumb?: string;
  summary?: string;
}

interface BulkOperationResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ ratingKey: string; error: string }>;
}

interface ArtworkAsset {
  type: ArtworkType;
  url: string;
  ratingKey?: string;
  selected: boolean;
}

type ArtworkType = 'poster' | 'background' | 'banner' | 'thumb';

interface Tag {
  tag: string;
  id?: string;
}

interface Role extends Tag {
  role?: string;
  thumb?: string;
}

interface MediaInfo {
  id: string;
  duration: number;
  bitrate: number;
  width: number;
  height: number;
  aspectRatio: number;
  audioChannels: number;
  audioCodec: string;
  videoCodec: string;
  container: string;
  videoResolution: string;
  parts: MediaPart[];
}

interface MediaPart {
  id: string;
  key: string;
  duration: number;
  file: string;
  size: number;
  container: string;
}

type MediaType = 'movie' | 'show' | 'season' | 'episode' | 'artist' | 'album' | 'track';
```

#### 5. External Metadata Provider

**Responsibilities:**
- Search external metadata sources
- Retrieve detailed metadata
- Import metadata into Plex

**Interface:**
```typescript
interface ExternalMetadataProvider {
  // Search
  search(query: string, type: MediaType, year?: number): Promise<SearchResult[]>;
  
  // Details
  getDetails(externalId: string): Promise<ExternalMetadata>;
  
  // Import
  importMetadata(ratingKey: string, externalId: string): Promise<void>;
}

interface SearchResult {
  externalId: string;
  title: string;
  originalTitle?: string;
  year?: number;
  thumb?: string;
  summary?: string;
  provider: 'tmdb' | 'imdb' | 'musicbrainz';
}

interface ExternalMetadata {
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
  provider: 'tmdb' | 'imdb' | 'musicbrainz';
}

interface ExternalCast {
  name: string;
  character: string;
  profilePath?: string;
  order: number;
}

interface ExternalCrew {
  name: string;
  job: string;
  department: string;
  profilePath?: string;
}
```

#### 6. Cache Manager

**Responsibilities:**
- Store metadata locally
- Manage cache lifecycle
- Sync offline changes
- Handle cache invalidation

**Interface:**
```typescript
interface CacheManager {
  // Cache operations
  cacheLibrarySection(sectionId: string): Promise<void>;
  cacheMetadata(item: MetadataItem): Promise<void>;
  cacheArtwork(url: string, data: Blob): Promise<string>;
  
  // Retrieval
  getCachedMetadata(ratingKey: string): Promise<MetadataItem | null>;
  getCachedArtwork(url: string): Promise<Blob | null>;
  getCachedLibraryItems(sectionId: string, options: QueryOptions): Promise<PaginatedResult<MetadataItem>>;
  
  // Offline changes
  queueOfflineChange(change: OfflineChange): Promise<void>;
  getOfflineChanges(): Promise<OfflineChange[]>;
  syncOfflineChanges(): Promise<SyncResult>;
  
  // Cache management
  getCacheSize(): Promise<number>;
  clearCache(olderThan?: Date): Promise<void>;
  isCacheAvailable(ratingKey: string): Promise<boolean>;
}

interface OfflineChange {
  id: string;
  timestamp: number;
  type: 'update' | 'match' | 'artwork';
  ratingKey: string;
  data: any;
  synced: boolean;
}

interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  conflicts: ConflictResolution[];
}

interface ConflictResolution {
  ratingKey: string;
  localChange: any;
  serverValue: any;
  resolution: 'local' | 'server' | 'manual';
}
```

#### 7. Collection Manager

**Responsibilities:**
- Manage collections
- Add/remove items
- Reorder collection items

**Interface:**
```typescript
interface CollectionManager {
  // Collections
  getCollections(sectionId: string): Promise<Collection[]>;
  getCollection(collectionId: string): Promise<Collection>;
  createCollection(sectionId: string, title: string): Promise<Collection>;
  deleteCollection(collectionId: string): Promise<void>;
  updateCollection(collectionId: string, updates: CollectionUpdate): Promise<void>;
  
  // Items
  addToCollection(collectionId: string, ratingKeys: string[]): Promise<void>;
  removeFromCollection(collectionId: string, itemId: string): Promise<void>;
  reorderInCollection(collectionId: string, itemId: string, afterItemId: string): Promise<void>;
}

interface Collection {
  ratingKey: string;
  key: string;
  title: string;
  summary?: string;
  thumb?: string;
  art?: string;
  childCount: number;
  addedAt: number;
  updatedAt: number;
}

interface CollectionUpdate {
  title?: string;
  summary?: string;
}
```

#### 8. Playlist Manager

**Responsibilities:**
- Manage playlists
- Add/remove items
- Reorder playlist items

**Interface:**
```typescript
interface PlaylistManager {
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

interface Playlist {
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
}

interface PlaylistUpdate {
  title?: string;
  summary?: string;
}
```

#### 9. Search Manager

**Responsibilities:**
- Search across libraries
- Filter and sort results
- Save search presets

**Interface:**
```typescript
interface SearchManager {
  // Search
  search(query: string, sectionId?: string): Promise<SearchResults>;
  searchLibrary(sectionId: string, query: string, type?: MediaType): Promise<MetadataItem[]>;
  
  // Filters
  applyFilters(sectionId: string, filters: FilterCriteria): Promise<MetadataItem[]>;
  saveFilterPreset(name: string, filters: FilterCriteria): Promise<void>;
  getFilterPresets(): Promise<FilterPreset[]>;
  deleteFilterPreset(presetId: string): Promise<void>;
}

interface SearchResults {
  hubs: SearchHub[];
  totalResults: number;
}

interface SearchHub {
  title: string;
  type: MediaType;
  items: MetadataItem[];
  size: number;
}

interface FilterCriteria {
  sectionId: string;
  type?: MediaType;
  filters: Record<string, any>;
  sort?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  criteria: FilterCriteria;
  createdAt: number;
}
```

#### 10. Batch Operation Manager

**Responsibilities:**
- Queue batch operations
- Execute operations with progress tracking
- Handle cancellation and retry

**Interface:**
```typescript
interface BatchOperationManager {
  // Operations
  queueOperation(operation: BatchOperation): Promise<string>;
  executeOperation(operationId: string): Promise<void>;
  cancelOperation(operationId: string): Promise<void>;
  retryFailedItems(operationId: string): Promise<void>;
  
  // Status
  getOperationStatus(operationId: string): Promise<OperationStatus>;
  getOperationHistory(): Promise<OperationHistory[]>;
}

interface BatchOperation {
  type: 'refresh' | 'match' | 'artwork' | 'update';
  ratingKeys: string[];
  data?: any;
}

interface OperationStatus {
  id: string;
  type: string;
  total: number;
  completed: number;
  failed: number;
  status: 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';
  progress: number;
  estimatedTimeRemaining?: number;
  errors: Array<{ ratingKey: string; error: string }>;
}

interface OperationHistory {
  id: string;
  type: string;
  total: number;
  succeeded: number;
  failed: number;
  startedAt: number;
  completedAt: number;
}
```

#### 11. Local Metadata Manager

**Responsibilities:**
- Read and write NFO files
- Read and write embedded metadata tags
- Sync between Plex and local files
- Validate file system access

**Interface:**
```typescript
interface LocalMetadataManager {
  // NFO file operations
  readNfoFile(filePath: string): Promise<NfoMetadata | null>;
  writeNfoFile(filePath: string, metadata: NfoMetadata): Promise<void>;
  deleteNfoFile(filePath: string): Promise<void>;
  backupNfoFile(filePath: string): Promise<string>;
  
  // Embedded metadata operations
  readEmbeddedMetadata(filePath: string): Promise<EmbeddedMetadata | null>;
  writeEmbeddedMetadata(filePath: string, metadata: EmbeddedMetadata): Promise<void>;
  
  // Sync operations
  syncToLocal(item: MetadataItem, mode: MetadataSaveMode): Promise<SyncResult>;
  syncFromLocal(filePath: string): Promise<MetadataItem>;
  detectLocalChanges(item: MetadataItem): Promise<LocalChangeDetection>;
  
  // Bulk operations
  bulkExportToLocal(ratingKeys: string[], format: 'nfo' | 'embedded' | 'both'): Promise<BulkExportResult>;
  
  // File system access
  validateAccess(directoryPath: string): Promise<AccessValidation>;
  getMediaFilePath(ratingKey: string): Promise<string | null>;
}

interface NfoMetadata {
  title: string;
  originalTitle?: string;
  year?: number;
  plot?: string;
  tagline?: string;
  rating?: number;
  mpaa?: string;
  genre?: string[];
  director?: string[];
  credits?: string[];
  actor?: Array<{ name: string; role: string; thumb?: string }>;
  studio?: string;
  premiered?: string;
  thumb?: string;
  fanart?: string;
  
  // TV-specific
  showtitle?: string;
  season?: number;
  episode?: number;
  aired?: string;
  
  // Music-specific
  artist?: string;
  album?: string;
  track?: number;
  duration?: number;
}

interface EmbeddedMetadata {
  // Common tags
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  genre?: string[];
  comment?: string;
  
  // Audio-specific (ID3)
  trackNumber?: number;
  albumArtist?: string;
  composer?: string;
  
  // Video-specific (MP4/MKV)
  description?: string;
  director?: string;
  cast?: string[];
}

interface MetadataSaveMode {
  target: 'plex' | 'local' | 'both';
  localFormat?: 'nfo' | 'embedded' | 'both';
  createBackup?: boolean;
  overwriteExisting?: boolean;
}

interface SyncResult {
  success: boolean;
  plexUpdated: boolean;
  nfoUpdated: boolean;
  embeddedUpdated: boolean;
  errors: string[];
}

interface LocalChangeDetection {
  hasLocalChanges: boolean;
  nfoExists: boolean;
  nfoModifiedAt?: number;
  embeddedModifiedAt?: number;
  plexModifiedAt: number;
  conflicts: Array<{ field: string; plexValue: any; localValue: any }>;
}

interface BulkExportResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ ratingKey: string; error: string }>;
}

interface AccessValidation {
  canRead: boolean;
  canWrite: boolean;
  path: string;
  error?: string;
}
```


## Data Models

### Database Schema (IndexedDB)

The application uses IndexedDB for offline storage with the following stores:

#### 1. Metadata Store
```typescript
interface MetadataRecord {
  ratingKey: string;          // Primary key
  sectionId: string;           // Index
  type: MediaType;             // Index
  data: MetadataItem;
  cachedAt: number;            // Index
  lastModified: number;
  dirty: boolean;              // Has offline changes
}
```

#### 2. Artwork Store
```typescript
interface ArtworkRecord {
  url: string;                 // Primary key
  blob: Blob;
  mimeType: string;
  size: number;
  cachedAt: number;            // Index
}
```

#### 3. Library Sections Store
```typescript
interface LibrarySectionRecord {
  key: string;                 // Primary key
  data: LibrarySection;
  cachedAt: number;
  itemCount: number;
}
```

#### 4. Offline Changes Store
```typescript
interface OfflineChangeRecord {
  id: string;                  // Primary key (UUID)
  timestamp: number;           // Index
  type: 'update' | 'match' | 'artwork';
  ratingKey: string;           // Index
  data: any;
  synced: boolean;             // Index
  error?: string;
}
```

#### 5. User Preferences Store
```typescript
interface UserPreferenceRecord {
  key: string;                 // Primary key
  value: any;
  updatedAt: number;
}
```

#### 6. Filter Presets Store
```typescript
interface FilterPresetRecord {
  id: string;                  // Primary key (UUID)
  name: string;
  criteria: FilterCriteria;
  createdAt: number;
  updatedAt: number;
}
```

#### 7. Operation History Store
```typescript
interface OperationHistoryRecord {
  id: string;                  // Primary key (UUID)
  type: string;
  total: number;
  succeeded: number;
  failed: number;
  startedAt: number;           // Index
  completedAt: number;
  errors: Array<{ ratingKey: string; error: string }>;
}
```

### Local Storage Schema

Settings and authentication data stored in LocalStorage (or electron-store for desktop):

```typescript
interface AppSettings {
  // Server connection
  selectedServerId?: string;
  lastConnectedServer?: PlexServer;
  
  // User context
  currentUserId?: string;
  
  // UI preferences
  theme: 'light' | 'dark' | 'system';
  defaultView: 'grid' | 'list';
  gridColumns: number;
  thumbnailQuality: 'low' | 'medium' | 'high';
  
  // External providers
  defaultMetadataProvider: 'tmdb' | 'imdb' | 'musicbrainz';
  tmdbApiKey?: string;
  
  // Cache settings
  cacheEnabled: boolean;
  maxCacheSize: number;        // MB
  cacheRetentionDays: number;
  autoSync: boolean;
  syncInterval: number;        // minutes
  
  // Local metadata settings
  metadataSaveMode: 'plex' | 'local' | 'both';
  localMetadataFormat: 'nfo' | 'embedded' | 'both';
  createNfoBackups: boolean;
  nfoTemplate: 'kodi' | 'emby' | 'custom';
  autoSyncLocalChanges: boolean;
  
  // Performance
  pageSize: number;
  imagePreloadCount: number;
  enableLazyLoading: boolean;
}

interface AuthData {
  tokens: Record<string, string>;  // userId -> token
  currentUser?: UserInfo;
  homeUsers?: HomeUser[];
}
```

### State Management

#### Global Application State (Zustand)

```typescript
interface AppState {
  // Authentication
  isAuthenticated: boolean;
  currentUser: UserInfo | null;
  currentToken: string | null;
  
  // Server
  selectedServer: PlexServer | null;
  serverConnection: ServerConnection | null;
  isOnline: boolean;
  
  // UI
  sidebarOpen: boolean;
  selectedLibrary: LibrarySection | null;
  selectedItems: Set<string>;
  
  // Operations
  activeOperations: Map<string, OperationStatus>;
  
  // Actions
  setAuthentication: (user: UserInfo, token: string) => void;
  setServer: (server: PlexServer, connection: ServerConnection) => void;
  setOnlineStatus: (online: boolean) => void;
  toggleSidebar: () => void;
  selectLibrary: (library: LibrarySection) => void;
  toggleItemSelection: (ratingKey: string) => void;
  clearSelection: () => void;
  addOperation: (operation: OperationStatus) => void;
  updateOperation: (id: string, updates: Partial<OperationStatus>) => void;
  removeOperation: (id: string) => void;
}
```

#### Server State (React Query)

React Query manages all server data with automatic caching, refetching, and invalidation:

```typescript
// Query keys
const queryKeys = {
  servers: ['servers'] as const,
  libraries: ['libraries'] as const,
  library: (id: string) => ['library', id] as const,
  libraryItems: (id: string, options: QueryOptions) => ['library', id, 'items', options] as const,
  metadata: (ratingKey: string) => ['metadata', ratingKey] as const,
  playlists: (type: 'audio' | 'video') => ['playlists', type] as const,
  collections: (sectionId: string) => ['collections', sectionId] as const,
  search: (query: string, sectionId?: string) => ['search', query, sectionId] as const,
};

// Query configurations
const queryConfig = {
  staleTime: 5 * 60 * 1000,      // 5 minutes
  cacheTime: 30 * 60 * 1000,     // 30 minutes
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
};
```


## Error Handling

### Error Classification

Errors are classified into categories for appropriate handling:

```typescript
enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  SERVER = 'server',
  VALIDATION = 'validation',
  CACHE = 'cache',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
}

interface AppError {
  category: ErrorCategory;
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  retryable: boolean;
}
```

### Error Handling Strategies

#### 1. Authentication Errors
- **401 Unauthorized**: Prompt user to re-authenticate
- **403 Forbidden**: Display permission error, suggest switching users
- **Token Expired**: Attempt token refresh, fallback to re-authentication

#### 2. Network Errors
- **Connection Timeout**: Retry with exponential backoff (3 attempts)
- **Server Unreachable**: Switch to offline mode, use cached data
- **DNS Failure**: Display connection error, offer manual server entry

#### 3. Server Errors
- **500 Internal Server Error**: Display error message, offer retry
- **503 Service Unavailable**: Display maintenance message, retry after delay
- **Rate Limiting**: Implement request throttling, queue requests

#### 4. Validation Errors
- **Invalid Input**: Display inline validation errors
- **Missing Required Fields**: Highlight fields, prevent submission
- **Format Errors**: Provide format hints, suggest corrections

#### 5. Cache Errors
- **Storage Quota Exceeded**: Prompt to clear old cache, adjust settings
- **Corrupted Cache**: Clear affected cache entries, refetch from server
- **Sync Conflicts**: Present conflict resolution UI

### Error Recovery

```typescript
interface ErrorRecoveryStrategy {
  // Automatic recovery
  retry(error: AppError, attempt: number): Promise<boolean>;
  fallback(error: AppError): Promise<void>;
  
  // User-initiated recovery
  promptReauthentication(): Promise<void>;
  switchToOfflineMode(): Promise<void>;
  clearCache(): Promise<void>;
  reportError(error: AppError): Promise<void>;
}
```

### User-Facing Error Messages

```typescript
const errorMessages: Record<string, string> = {
  // Authentication
  'AUTH_INVALID_TOKEN': 'Your session has expired. Please sign in again.',
  'AUTH_PERMISSION_DENIED': 'You don\'t have permission to perform this action.',
  
  // Network
  'NETWORK_TIMEOUT': 'The request timed out. Please check your connection and try again.',
  'NETWORK_OFFLINE': 'You appear to be offline. Some features may be unavailable.',
  'NETWORK_SERVER_UNREACHABLE': 'Unable to connect to your Plex server. Switching to offline mode.',
  
  // Server
  'SERVER_ERROR': 'The server encountered an error. Please try again later.',
  'SERVER_MAINTENANCE': 'The server is currently undergoing maintenance.',
  
  // Validation
  'VALIDATION_REQUIRED_FIELD': 'This field is required.',
  'VALIDATION_INVALID_FORMAT': 'Please enter a valid value.',
  
  // Cache
  'CACHE_QUOTA_EXCEEDED': 'Storage is full. Please clear some cached data.',
  'CACHE_SYNC_CONFLICT': 'This item was modified on the server. Choose which version to keep.',
};
```

### Logging

```typescript
interface Logger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, error: Error, context?: any): void;
}

// Log levels
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Log destinations
interface LogDestination {
  console: boolean;
  file: boolean;          // Desktop only
  remote: boolean;        // Optional error reporting service
}
```


## Testing Strategy

### Testing Approach

The Plex Media Manager is primarily a CRUD application with external API integration, UI rendering, and data synchronization. **Property-based testing is NOT appropriate** for this feature because:

1. **External API Integration**: Most functionality depends on Plex API behavior, which is external and deterministic
2. **UI-Heavy Application**: Significant portions involve rendering, user interactions, and visual feedback
3. **CRUD Operations**: Core operations are simple create, read, update, delete with no complex transformation logic
4. **Configuration and State Management**: Much of the logic involves managing application state and user preferences

Instead, the testing strategy focuses on:
- **Unit tests** for business logic, validation, and data transformations
- **Integration tests** for API client interactions and cache synchronization
- **End-to-end tests** for critical user workflows
- **Mock-based tests** for external dependencies

### Test Coverage Goals

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|------------|-------------------|-----------|
| Authentication Manager | 90% | Yes | Yes |
| Server Manager | 85% | Yes | Yes |
| Library Manager | 85% | Yes | Yes |
| Metadata Manager | 90% | Yes | Yes |
| Cache Manager | 95% | Yes | No |
| External Providers | 80% | Yes | No |
| UI Components | 70% | No | Yes |

### Unit Testing

**Focus Areas:**
- Input validation and sanitization
- Data transformation and formatting
- Business logic and rules
- Error handling and recovery
- State management reducers

**Example Tests:**
```typescript
describe('MetadataManager', () => {
  describe('updateMetadata', () => {
    it('should validate required fields', async () => {
      const manager = new MetadataManager(mockApiClient);
      await expect(
        manager.updateMetadata('123', { title: '' })
      ).rejects.toThrow('Title cannot be empty');
    });
    
    it('should sanitize HTML in summary', async () => {
      const manager = new MetadataManager(mockApiClient);
      const result = await manager.updateMetadata('123', {
        summary: '<script>alert("xss")</script>Safe text'
      });
      expect(result.summary).toBe('Safe text');
    });
    
    it('should handle API errors gracefully', async () => {
      const mockClient = createMockClient({ shouldFail: true });
      const manager = new MetadataManager(mockClient);
      await expect(
        manager.updateMetadata('123', { title: 'New Title' })
      ).rejects.toThrow(AppError);
    });
  });
  
  describe('bulkUpdateMetadata', () => {
    it('should report partial success', async () => {
      const manager = new MetadataManager(mockApiClient);
      const result = await manager.bulkUpdateMetadata(
        ['1', '2', '3'],
        { studio: 'New Studio' }
      );
      expect(result.total).toBe(3);
      expect(result.succeeded).toBeGreaterThan(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('CacheManager', () => {
  describe('syncOfflineChanges', () => {
    it('should detect conflicts', async () => {
      const manager = new CacheManager(mockDb, mockApiClient);
      const result = await manager.syncOfflineChanges();
      expect(result.conflicts).toBeDefined();
    });
    
    it('should preserve local changes on sync failure', async () => {
      const manager = new CacheManager(mockDb, mockApiClient);
      const changes = await manager.getOfflineChanges();
      await manager.syncOfflineChanges();
      const remainingChanges = await manager.getOfflineChanges();
      expect(remainingChanges.length).toBeGreaterThan(0);
    });
  });
});

describe('AuthenticationManager', () => {
  describe('validateToken', () => {
    it('should return false for expired tokens', async () => {
      const manager = new AuthenticationManager(mockPlexClient);
      const isValid = await manager.validateToken('expired-token');
      expect(isValid).toBe(false);
    });
    
    it('should return true for valid tokens', async () => {
      const manager = new AuthenticationManager(mockPlexClient);
      const isValid = await manager.validateToken('valid-token');
      expect(isValid).toBe(true);
    });
  });
});
```

### Integration Testing

**Focus Areas:**
- API client interactions with mock server
- Cache synchronization workflows
- Multi-step operations (match, refresh, sync)
- Error recovery and retry logic

**Example Tests:**
```typescript
describe('Library Integration', () => {
  let mockServer: MockPlexServer;
  let libraryManager: LibraryManager;
  
  beforeEach(() => {
    mockServer = createMockPlexServer();
    libraryManager = new LibraryManager(mockServer.client);
  });
  
  it('should fetch and cache library sections', async () => {
    const sections = await libraryManager.getLibrarySections();
    expect(sections).toHaveLength(3);
    expect(mockServer.requestCount).toBe(1);
    
    // Second call should use cache
    const cachedSections = await libraryManager.getLibrarySections();
    expect(cachedSections).toEqual(sections);
    expect(mockServer.requestCount).toBe(1);
  });
  
  it('should handle pagination correctly', async () => {
    const page1 = await libraryManager.getLibraryItems('1', {
      offset: 0,
      limit: 50
    });
    expect(page1.items).toHaveLength(50);
    expect(page1.totalSize).toBe(150);
    
    const page2 = await libraryManager.getLibraryItems('1', {
      offset: 50,
      limit: 50
    });
    expect(page2.items).toHaveLength(50);
    expect(page2.offset).toBe(50);
  });
});

describe('Offline Sync Integration', () => {
  it('should sync offline changes when connection restored', async () => {
    const cacheManager = new CacheManager(db, apiClient);
    
    // Make offline changes
    await cacheManager.queueOfflineChange({
      id: '1',
      timestamp: Date.now(),
      type: 'update',
      ratingKey: '123',
      data: { title: 'New Title' },
      synced: false
    });
    
    // Simulate connection restored
    const result = await cacheManager.syncOfflineChanges();
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
  });
});
```

### End-to-End Testing

**Focus Areas:**
- Critical user workflows
- Authentication flow
- Metadata editing workflow
- Offline mode and sync
- Bulk operations

**Example Tests:**
```typescript
describe('Authentication Flow', () => {
  it('should complete PIN-based OAuth flow', async () => {
    await page.goto('/');
    await page.click('[data-testid="sign-in-button"]');
    
    // Wait for PIN display
    const pinCode = await page.textContent('[data-testid="pin-code"]');
    expect(pinCode).toMatch(/^[A-Z0-9]{4}$/);
    
    // Simulate PIN claimed (mock)
    await mockPlexAuth.claimPin(pinCode);
    
    // Should redirect to server selection
    await page.waitForURL('/servers');
    expect(await page.textContent('h1')).toBe('Select Server');
  });
});

describe('Metadata Editing Workflow', () => {
  it('should edit and save movie metadata', async () => {
    await page.goto('/library/1/movie/123');
    
    // Edit title
    await page.click('[data-testid="edit-button"]');
    await page.fill('[data-testid="title-input"]', 'New Movie Title');
    await page.fill('[data-testid="year-input"]', '2024');
    
    // Save
    await page.click('[data-testid="save-button"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // Verify updated values
    expect(await page.textContent('[data-testid="movie-title"]')).toBe('New Movie Title');
    expect(await page.textContent('[data-testid="movie-year"]')).toBe('2024');
  });
});

describe('Bulk Operations', () => {
  it('should perform bulk metadata update', async () => {
    await page.goto('/library/1/movies');
    
    // Select multiple items
    await page.click('[data-testid="item-checkbox-1"]');
    await page.click('[data-testid="item-checkbox-2"]');
    await page.click('[data-testid="item-checkbox-3"]');
    
    // Open bulk edit
    await page.click('[data-testid="bulk-edit-button"]');
    
    // Update studio
    await page.fill('[data-testid="studio-input"]', 'Universal Pictures');
    await page.click('[data-testid="apply-button"]');
    
    // Verify progress
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('[data-testid="operation-complete"]');
    expect(await page.textContent('[data-testid="success-count"]')).toBe('3');
  });
});
```

### Performance Testing

**Focus Areas:**
- Large library loading (10,000+ items)
- Image loading and caching
- Bulk operation throughput
- Memory usage during long sessions

**Benchmarks:**
- Library view load: < 2 seconds for 10,000 items
- Metadata detail view: < 500ms
- Image thumbnail load: < 200ms (cached), < 1s (network)
- Bulk update: > 10 items/second
- Memory usage: < 500MB for typical session

### Test Data

**Mock Data Generation:**
```typescript
function generateMockLibrary(itemCount: number): MetadataItem[] {
  return Array.from({ length: itemCount }, (_, i) => ({
    ratingKey: `${i + 1}`,
    key: `/library/metadata/${i + 1}`,
    guid: `plex://movie/${i + 1}`,
    type: 'movie',
    title: `Movie ${i + 1}`,
    year: 2000 + (i % 24),
    thumb: `/library/metadata/${i + 1}/thumb`,
    addedAt: Date.now() - (i * 86400000),
    updatedAt: Date.now() - (i * 86400000),
  }));
}

function generateMockServer(): PlexServer {
  return {
    machineIdentifier: 'test-server-id',
    name: 'Test Plex Server',
    version: '1.40.0',
    connections: [
      {
        protocol: 'http',
        address: '192.168.1.100',
        port: 32400,
        local: true,
        relay: false,
        uri: 'http://192.168.1.100:32400',
      },
    ],
    owned: true,
    home: true,
  };
}
```

### Continuous Integration

**CI Pipeline:**
1. Lint and type check
2. Run unit tests (parallel)
3. Run integration tests (sequential)
4. Build application
5. Run E2E tests (parallel)
6. Generate coverage report
7. Deploy preview build (PR only)

**Coverage Requirements:**
- Overall: 80% minimum
- Critical paths: 95% minimum
- New code: 85% minimum


## Implementation Details

### Authentication Flow

#### PIN-Based OAuth Implementation

```typescript
class PlexAuthenticationManager implements AuthenticationManager {
  private readonly PLEX_TV_URL = 'https://plex.tv';
  private readonly POLL_INTERVAL = 1000; // 1 second
  private readonly POLL_TIMEOUT = 300000; // 5 minutes
  
  async generatePin(): Promise<PinResponse> {
    const response = await axios.post(`${this.PLEX_TV_URL}/api/v2/pins`, {
      strong: true,
    }, {
      headers: {
        'X-Plex-Product': 'Plex Media Manager',
        'X-Plex-Client-Identifier': this.clientId,
      },
    });
    
    return {
      id: response.data.id,
      code: response.data.code,
      expiresAt: response.data.expiresAt,
    };
  }
  
  async pollPinStatus(pinId: string, code: string): Promise<AuthToken | null> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.POLL_TIMEOUT) {
      const response = await axios.get(
        `${this.PLEX_TV_URL}/api/v2/pins/${pinId}`,
        {
          params: { code },
          headers: {
            'X-Plex-Product': 'Plex Media Manager',
            'X-Plex-Client-Identifier': this.clientId,
          },
        }
      );
      
      if (response.data.authToken) {
        return {
          token: response.data.authToken,
          expiresAt: response.data.expiresAt,
        };
      }
      
      await this.sleep(this.POLL_INTERVAL);
    }
    
    return null;
  }
  
  async validateToken(token: string): Promise<boolean> {
    try {
      await axios.get(`${this.PLEX_TV_URL}/api/v2/user`, {
        headers: { 'X-Plex-Token': token },
      });
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }
      throw error;
    }
  }
  
  async getUserInfo(token: string): Promise<UserInfo> {
    const response = await axios.get(`${this.PLEX_TV_URL}/api/v2/user`, {
      headers: { 'X-Plex-Token': token },
    });
    
    return {
      id: response.data.id,
      username: response.data.username,
      email: response.data.email,
      thumb: response.data.thumb,
      isAdmin: response.data.admin === 1,
      isRestricted: response.data.restricted === 1,
    };
  }
  
  async getHomeUsers(adminToken: string): Promise<HomeUser[]> {
    const response = await axios.get(`${this.PLEX_TV_URL}/api/v2/home/users`, {
      headers: { 'X-Plex-Token': adminToken },
    });
    
    return response.data.map((user: any) => ({
      id: user.id,
      title: user.title,
      username: user.username,
      thumb: user.thumb,
      admin: user.admin === 1,
      restricted: user.restricted === 1,
    }));
  }
  
  async switchUser(adminToken: string, userId: string): Promise<AuthToken> {
    const response = await axios.post(
      `${this.PLEX_TV_URL}/api/v2/home/users/${userId}/switch`,
      {},
      {
        headers: { 'X-Plex-Token': adminToken },
      }
    );
    
    return {
      token: response.data.authToken,
    };
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Server Discovery and Connection

```typescript
class PlexServerManager implements ServerManager {
  async discoverServers(token: string): Promise<PlexServer[]> {
    const response = await axios.get('https://plex.tv/api/v2/resources', {
      params: {
        includeHttps: 1,
        includeRelay: 1,
      },
      headers: {
        'X-Plex-Token': token,
        'X-Plex-Client-Identifier': this.clientId,
      },
    });
    
    return response.data
      .filter((resource: any) => resource.provides === 'server')
      .map((resource: any) => ({
        machineIdentifier: resource.clientIdentifier,
        name: resource.name,
        version: resource.productVersion,
        connections: resource.connections.map((conn: any) => ({
          protocol: conn.protocol,
          address: conn.address,
          port: conn.port,
          local: conn.local === 1,
          relay: conn.relay === 1,
          uri: conn.uri,
        })),
        owned: resource.owned === 1,
        home: resource.home === 1,
      }));
  }
  
  async getOptimalConnection(server: PlexServer): Promise<ServerConnection> {
    // Test connections in priority order:
    // 1. Local HTTPS
    // 2. Local HTTP
    // 3. Remote HTTPS
    // 4. Remote HTTP
    // 5. Relay
    
    const prioritized = this.prioritizeConnections(server.connections);
    
    for (const connection of prioritized) {
      const result = await this.testConnection(server, connection);
      if (result.success) {
        return connection;
      }
    }
    
    throw new Error('No working connection found');
  }
  
  private prioritizeConnections(connections: ServerConnection[]): ServerConnection[] {
    return connections.sort((a, b) => {
      // Local HTTPS
      if (a.local && a.protocol === 'https' && (!b.local || b.protocol !== 'https')) return -1;
      if (b.local && b.protocol === 'https' && (!a.local || a.protocol !== 'https')) return 1;
      
      // Local HTTP
      if (a.local && !b.local) return -1;
      if (b.local && !a.local) return 1;
      
      // Remote HTTPS
      if (!a.relay && a.protocol === 'https' && (b.relay || b.protocol !== 'https')) return -1;
      if (!b.relay && b.protocol === 'https' && (a.relay || a.protocol !== 'https')) return 1;
      
      // Remote HTTP
      if (!a.relay && b.relay) return -1;
      if (!b.relay && a.relay) return 1;
      
      return 0;
    });
  }
  
  async testConnection(server: PlexServer, connection: ServerConnection): Promise<ConnectionResult> {
    const startTime = Date.now();
    
    try {
      await axios.get(`${connection.uri}/identity`, {
        timeout: 5000,
        headers: {
          'X-Plex-Client-Identifier': this.clientId,
        },
      });
      
      return {
        success: true,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
```

### Cache Synchronization

```typescript
class PlexCacheManager implements CacheManager {
  private db: IDBDatabase;
  private apiClient: PlexApiClient;
  
  async syncOfflineChanges(): Promise<SyncResult> {
    const changes = await this.getOfflineChanges();
    const result: SyncResult = {
      total: changes.length,
      synced: 0,
      failed: 0,
      conflicts: [],
    };
    
    for (const change of changes) {
      try {
        // Fetch current server state
        const serverMetadata = await this.apiClient.getMetadata(change.ratingKey);
        
        // Check for conflicts
        const conflict = this.detectConflict(change, serverMetadata);
        if (conflict) {
          result.conflicts.push({
            ratingKey: change.ratingKey,
            localChange: change.data,
            serverValue: serverMetadata,
            resolution: 'manual', // Requires user decision
          });
          continue;
        }
        
        // Apply change
        await this.applyChange(change);
        
        // Mark as synced
        await this.markChangeSynced(change.id);
        result.synced++;
        
      } catch (error) {
        result.failed++;
        await this.updateChangeError(change.id, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    return result;
  }
  
  private detectConflict(change: OfflineChange, serverMetadata: MetadataItem): boolean {
    // Conflict if server was modified after local change
    return serverMetadata.updatedAt > change.timestamp;
  }
  
  private async applyChange(change: OfflineChange): Promise<void> {
    switch (change.type) {
      case 'update':
        await this.apiClient.updateMetadata(change.ratingKey, change.data);
        break;
      case 'match':
        await this.apiClient.matchMetadata(change.ratingKey, change.data.guid);
        break;
      case 'artwork':
        await this.apiClient.uploadArtwork(change.ratingKey, change.data.file, change.data.type);
        break;
    }
  }
  
  async cacheLibrarySection(sectionId: string): Promise<void> {
    let offset = 0;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const result = await this.apiClient.getLibraryItems(sectionId, {
        offset,
        limit,
      });
      
      // Cache items
      for (const item of result.items) {
        await this.cacheMetadata(item);
        
        // Cache artwork
        if (item.thumb) {
          await this.cacheArtworkUrl(item.thumb);
        }
        if (item.art) {
          await this.cacheArtworkUrl(item.art);
        }
      }
      
      offset += result.size;
      hasMore = offset < result.totalSize;
      
      // Emit progress event
      this.emit('cache-progress', {
        sectionId,
        cached: offset,
        total: result.totalSize,
        progress: (offset / result.totalSize) * 100,
      });
    }
  }
  
  private async cacheArtworkUrl(url: string): Promise<void> {
    try {
      const response = await axios.get(url, {
        responseType: 'blob',
      });
      
      await this.cacheArtwork(url, response.data);
    } catch (error) {
      console.warn(`Failed to cache artwork: ${url}`, error);
    }
  }
}
```

### Bulk Operations

```typescript
class PlexBatchOperationManager implements BatchOperationManager {
  private operations = new Map<string, OperationStatus>();
  private queues = new Map<string, BatchOperation>();
  
  async queueOperation(operation: BatchOperation): Promise<string> {
    const id = this.generateId();
    
    this.queues.set(id, operation);
    this.operations.set(id, {
      id,
      type: operation.type,
      total: operation.ratingKeys.length,
      completed: 0,
      failed: 0,
      status: 'queued',
      progress: 0,
      errors: [],
    });
    
    return id;
  }
  
  async executeOperation(operationId: string): Promise<void> {
    const operation = this.queues.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }
    
    const status = this.operations.get(operationId)!;
    status.status = 'running';
    
    const startTime = Date.now();
    
    for (let i = 0; i < operation.ratingKeys.length; i++) {
      // Check for cancellation
      if (status.status === 'cancelled') {
        break;
      }
      
      const ratingKey = operation.ratingKeys[i];
      
      try {
        await this.executeItem(operation.type, ratingKey, operation.data);
        status.completed++;
      } catch (error) {
        status.failed++;
        status.errors.push({
          ratingKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      
      // Update progress
      status.progress = ((i + 1) / operation.ratingKeys.length) * 100;
      
      // Estimate time remaining
      const elapsed = Date.now() - startTime;
      const avgTimePerItem = elapsed / (i + 1);
      const remaining = operation.ratingKeys.length - (i + 1);
      status.estimatedTimeRemaining = avgTimePerItem * remaining;
      
      // Emit progress event
      this.emit('operation-progress', status);
    }
    
    status.status = status.failed === 0 ? 'completed' : 'failed';
    status.estimatedTimeRemaining = undefined;
    
    // Save to history
    await this.saveToHistory(status);
    
    // Clean up
    this.queues.delete(operationId);
  }
  
  private async executeItem(type: string, ratingKey: string, data: any): Promise<void> {
    switch (type) {
      case 'refresh':
        await this.metadataManager.refreshMetadata(ratingKey);
        break;
      case 'match':
        await this.metadataManager.matchMetadata(ratingKey, data.guid);
        break;
      case 'artwork':
        await this.metadataManager.selectArtwork(ratingKey, data.url, data.type);
        break;
      case 'update':
        await this.metadataManager.updateMetadata(ratingKey, data);
        break;
    }
  }
  
  async cancelOperation(operationId: string): Promise<void> {
    const status = this.operations.get(operationId);
    if (status && status.status === 'running') {
      status.status = 'cancelled';
    }
  }
  
  async retryFailedItems(operationId: string): Promise<void> {
    const status = this.operations.get(operationId);
    if (!status || status.errors.length === 0) {
      return;
    }
    
    const failedKeys = status.errors.map(e => e.ratingKey);
    const operation = this.queues.get(operationId);
    
    if (operation) {
      const retryOperation: BatchOperation = {
        ...operation,
        ratingKeys: failedKeys,
      };
      
      const newId = await this.queueOperation(retryOperation);
      await this.executeOperation(newId);
    }
  }
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Image Transcoding

```typescript
class PlexImageTranscoder {
  private serverUrl: string;
  private token: string;
  
  getTranscodedUrl(thumbPath: string, width: number, height: number): string {
    const params = new URLSearchParams({
      url: thumbPath,
      width: width.toString(),
      height: height.toString(),
      minSize: '1',
      upscale: '1',
      'X-Plex-Token': this.token,
    });
    
    return `${this.serverUrl}/photo/:/transcode?${params.toString()}`;
  }
  
  getResponsiveUrls(thumbPath: string): Record<string, string> {
    return {
      thumbnail: this.getTranscodedUrl(thumbPath, 200, 300),
      small: this.getTranscodedUrl(thumbPath, 400, 600),
      medium: this.getTranscodedUrl(thumbPath, 800, 1200),
      large: this.getTranscodedUrl(thumbPath, 1200, 1800),
    };
  }
  
  getCompositeUrl(compositePath: string): string {
    return `${this.serverUrl}${compositePath}?X-Plex-Token=${this.token}`;
  }
}
```

### Real-time Updates

```typescript
class PlexWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  
  connect(serverUrl: string, token: string): void {
    const wsUrl = serverUrl.replace(/^http/, 'ws') + '/:/websocket/notifications';
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.send({ type: 'subscribe', token });
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleNotification(data);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.attemptReconnect(serverUrl, token);
    };
  }
  
  private handleNotification(data: any): void {
    switch (data.NotificationContainer?.type) {
      case 'timeline':
        this.emit('timeline-update', data.NotificationContainer.TimelineEntry);
        break;
      case 'activity':
        this.emit('activity-update', data.NotificationContainer.ActivityNotification);
        break;
      case 'playing':
        this.emit('playback-update', data.NotificationContainer.PlaySessionStateNotification);
        break;
    }
  }
  
  private attemptReconnect(serverUrl: string, token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`Reconnecting... (attempt ${this.reconnectAttempts})`);
      this.connect(serverUrl, token);
    }, delay);
  }
  
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
```

### Local Metadata File Management

#### NFO File Operations

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

class LocalMetadataManager implements LocalMetadataManager {
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;
  
  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
    });
  }
  
  async readNfoFile(filePath: string): Promise<NfoMetadata | null> {
    try {
      const nfoPath = this.getNfoPath(filePath);
      const content = await fs.readFile(nfoPath, 'utf-8');
      const parsed = this.xmlParser.parse(content);
      
      // Handle different root elements (movie, tvshow, episodedetails, etc.)
      const root = parsed.movie || parsed.tvshow || parsed.episodedetails || parsed.artist || parsed.album;
      if (!root) return null;
      
      return this.parseNfoToMetadata(root);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // File doesn't exist
      }
      throw error;
    }
  }
  
  async writeNfoFile(filePath: string, metadata: NfoMetadata): Promise<void> {
    const nfoPath = this.getNfoPath(filePath);
    
    // Create backup if file exists
    if (await this.fileExists(nfoPath)) {
      await this.backupNfoFile(filePath);
    }
    
    // Determine NFO type based on metadata
    const nfoType = this.determineNfoType(metadata);
    const nfoData = this.metadataToNfo(metadata, nfoType);
    
    const xml = this.xmlBuilder.build({ [nfoType]: nfoData });
    await fs.writeFile(nfoPath, xml, 'utf-8');
  }
  
  async backupNfoFile(filePath: string): Promise<string> {
    const nfoPath = this.getNfoPath(filePath);
    const backupPath = `${nfoPath}.backup.${Date.now()}`;
    
    await fs.copyFile(nfoPath, backupPath);
    return backupPath;
  }
  
  private getNfoPath(mediaFilePath: string): string {
    const ext = path.extname(mediaFilePath);
    const basePath = mediaFilePath.slice(0, -ext.length);
    return `${basePath}.nfo`;
  }
  
  private determineNfoType(metadata: NfoMetadata): string {
    if (metadata.episode !== undefined) return 'episodedetails';
    if (metadata.showtitle) return 'tvshow';
    if (metadata.album) return 'album';
    if (metadata.artist && !metadata.album) return 'artist';
    return 'movie';
  }
  
  private parseNfoToMetadata(nfoData: any): NfoMetadata {
    return {
      title: nfoData.title,
      originalTitle: nfoData.originaltitle,
      year: nfoData.year ? parseInt(nfoData.year) : undefined,
      plot: nfoData.plot,
      tagline: nfoData.tagline,
      rating: nfoData.rating ? parseFloat(nfoData.rating) : undefined,
      mpaa: nfoData.mpaa,
      genre: Array.isArray(nfoData.genre) ? nfoData.genre : nfoData.genre ? [nfoData.genre] : undefined,
      director: Array.isArray(nfoData.director) ? nfoData.director : nfoData.director ? [nfoData.director] : undefined,
      credits: Array.isArray(nfoData.credits) ? nfoData.credits : nfoData.credits ? [nfoData.credits] : undefined,
      actor: this.parseActors(nfoData.actor),
      studio: nfoData.studio,
      premiered: nfoData.premiered,
      thumb: nfoData.thumb,
      fanart: nfoData.fanart?.thumb || nfoData.fanart,
      // TV-specific
      showtitle: nfoData.showtitle,
      season: nfoData.season ? parseInt(nfoData.season) : undefined,
      episode: nfoData.episode ? parseInt(nfoData.episode) : undefined,
      aired: nfoData.aired,
      // Music-specific
      artist: nfoData.artist,
      album: nfoData.album,
      track: nfoData.track ? parseInt(nfoData.track) : undefined,
      duration: nfoData.duration ? parseInt(nfoData.duration) : undefined,
    };
  }
  
  private parseActors(actorData: any): Array<{ name: string; role: string; thumb?: string }> | undefined {
    if (!actorData) return undefined;
    
    const actors = Array.isArray(actorData) ? actorData : [actorData];
    return actors.map(actor => ({
      name: actor.name,
      role: actor.role,
      thumb: actor.thumb,
    }));
  }
  
  private metadataToNfo(metadata: NfoMetadata, type: string): any {
    const nfo: any = {
      title: metadata.title,
      originaltitle: metadata.originalTitle,
      year: metadata.year,
      plot: metadata.plot,
      tagline: metadata.tagline,
      rating: metadata.rating,
      mpaa: metadata.mpaa,
      genre: metadata.genre,
      director: metadata.director,
      credits: metadata.credits,
      studio: metadata.studio,
      premiered: metadata.premiered,
      thumb: metadata.thumb,
    };
    
    if (metadata.fanart) {
      nfo.fanart = { thumb: metadata.fanart };
    }
    
    if (metadata.actor) {
      nfo.actor = metadata.actor.map(actor => ({
        name: actor.name,
        role: actor.role,
        thumb: actor.thumb,
      }));
    }
    
    // Type-specific fields
    if (type === 'episodedetails') {
      nfo.showtitle = metadata.showtitle;
      nfo.season = metadata.season;
      nfo.episode = metadata.episode;
      nfo.aired = metadata.aired;
    } else if (type === 'tvshow') {
      nfo.showtitle = metadata.showtitle || metadata.title;
    } else if (type === 'album' || type === 'artist') {
      nfo.artist = metadata.artist;
      nfo.album = metadata.album;
      nfo.track = metadata.track;
      nfo.duration = metadata.duration;
    }
    
    // Remove undefined values
    Object.keys(nfo).forEach(key => {
      if (nfo[key] === undefined) {
        delete nfo[key];
      }
    });
    
    return nfo;
  }
  
  async getMediaFilePath(ratingKey: string): Promise<string | null> {
    // Get media file path from Plex API
    const metadata = await this.metadataManager.getMetadata(ratingKey);
    
    if (!metadata.media || metadata.media.length === 0) {
      return null;
    }
    
    const media = metadata.media[0];
    if (!media.parts || media.parts.length === 0) {
      return null;
    }
    
    return media.parts[0].file;
  }
  
  async validateAccess(directoryPath: string): Promise<AccessValidation> {
    try {
      // Check read access
      await fs.access(directoryPath, fs.constants.R_OK);
      const canRead = true;
      
      // Check write access
      let canWrite = false;
      try {
        await fs.access(directoryPath, fs.constants.W_OK);
        canWrite = true;
      } catch (error) {
        // Write access denied
      }
      
      return {
        canRead,
        canWrite,
        path: directoryPath,
      };
    } catch (error) {
      return {
        canRead: false,
        canWrite: false,
        path: directoryPath,
        error: error.message,
      };
    }
  }
  
  async syncToLocal(item: MetadataItem, mode: MetadataSaveMode): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      plexUpdated: false,
      nfoUpdated: false,
      embeddedUpdated: false,
      errors: [],
    };
    
    try {
      // Get media file path
      const filePath = await this.getMediaFilePath(item.ratingKey);
      if (!filePath) {
        result.errors.push('Media file path not found');
        return result;
      }
      
      // Validate access
      const access = await this.validateAccess(path.dirname(filePath));
      if (!access.canWrite) {
        result.errors.push('No write access to media directory');
        return result;
      }
      
      // Convert Plex metadata to NFO format
      const nfoMetadata = this.plexToNfo(item);
      
      // Write NFO file
      if (mode.target === 'local' || mode.target === 'both') {
        if (!mode.localFormat || mode.localFormat === 'nfo' || mode.localFormat === 'both') {
          try {
            await this.writeNfoFile(filePath, nfoMetadata);
            result.nfoUpdated = true;
          } catch (error) {
            result.errors.push(`NFO write failed: ${error.message}`);
          }
        }
        
        // Write embedded metadata (for audio/video files)
        if (mode.localFormat === 'embedded' || mode.localFormat === 'both') {
          try {
            const embeddedMetadata = this.plexToEmbedded(item);
            await this.writeEmbeddedMetadata(filePath, embeddedMetadata);
            result.embeddedUpdated = true;
          } catch (error) {
            result.errors.push(`Embedded metadata write failed: ${error.message}`);
          }
        }
      }
      
      // Update Plex
      if (mode.target === 'plex' || mode.target === 'both') {
        try {
          await this.metadataManager.updateMetadata(item.ratingKey, item);
          result.plexUpdated = true;
        } catch (error) {
          result.errors.push(`Plex update failed: ${error.message}`);
        }
      }
      
      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(error.message);
    }
    
    return result;
  }
  
  private plexToNfo(item: MetadataItem): NfoMetadata {
    const nfo: NfoMetadata = {
      title: item.title,
      originalTitle: item.originalTitle,
      year: item.year,
      plot: item.summary,
      tagline: item.tagline,
      rating: item.rating,
      mpaa: item.contentRating,
      genre: item.genres?.map(g => g.tag),
      director: item.directors?.map(d => d.tag),
      credits: item.writers?.map(w => w.tag),
      actor: item.roles?.map(r => ({
        name: r.tag,
        role: r.role || '',
        thumb: r.thumb,
      })),
      studio: item.studio,
      thumb: item.thumb,
      fanart: item.art,
    };
    
    // TV-specific
    if (item.type === 'episode') {
      nfo.showtitle = item.grandparentTitle;
      nfo.season = item.parentIndex;
      nfo.episode = item.index;
    } else if (item.type === 'show') {
      nfo.showtitle = item.title;
    }
    
    // Music-specific
    if (item.type === 'track') {
      nfo.artist = item.grandparentTitle;
      nfo.album = item.parentTitle;
      nfo.track = item.index;
      nfo.duration = item.duration;
    } else if (item.type === 'album') {
      nfo.artist = item.parentTitle;
      nfo.album = item.title;
    }
    
    return nfo;
  }
  
  private plexToEmbedded(item: MetadataItem): EmbeddedMetadata {
    return {
      title: item.title,
      artist: item.grandparentTitle || item.parentTitle,
      album: item.parentTitle,
      year: item.year,
      genre: item.genres?.map(g => g.tag),
      comment: item.summary,
      trackNumber: item.index,
      description: item.summary,
      director: item.directors?.[0]?.tag,
      cast: item.roles?.map(r => r.tag),
    };
  }
  
  async detectLocalChanges(item: MetadataItem): Promise<LocalChangeDetection> {
    const filePath = await this.getMediaFilePath(item.ratingKey);
    if (!filePath) {
      return {
        hasLocalChanges: false,
        nfoExists: false,
        plexModifiedAt: item.updatedAt,
        conflicts: [],
      };
    }
    
    const nfoPath = this.getNfoPath(filePath);
    const nfoExists = await this.fileExists(nfoPath);
    
    if (!nfoExists) {
      return {
        hasLocalChanges: false,
        nfoExists: false,
        plexModifiedAt: item.updatedAt,
        conflicts: [],
      };
    }
    
    // Get NFO modification time
    const nfoStats = await fs.stat(nfoPath);
    const nfoModifiedAt = nfoStats.mtimeMs;
    
    // Read NFO content
    const nfoMetadata = await this.readNfoFile(filePath);
    if (!nfoMetadata) {
      return {
        hasLocalChanges: false,
        nfoExists: true,
        nfoModifiedAt,
        plexModifiedAt: item.updatedAt,
        conflicts: [],
      };
    }
    
    // Compare metadata
    const conflicts = this.compareMetadata(item, nfoMetadata);
    
    return {
      hasLocalChanges: conflicts.length > 0,
      nfoExists: true,
      nfoModifiedAt,
      plexModifiedAt: item.updatedAt,
      conflicts,
    };
  }
  
  private compareMetadata(plexItem: MetadataItem, nfoMetadata: NfoMetadata): Array<{ field: string; plexValue: any; localValue: any }> {
    const conflicts: Array<{ field: string; plexValue: any; localValue: any }> = [];
    
    const fields = ['title', 'year', 'plot', 'tagline', 'rating'];
    
    for (const field of fields) {
      const plexValue = plexItem[field === 'plot' ? 'summary' : field];
      const nfoValue = nfoMetadata[field];
      
      if (plexValue !== nfoValue && nfoValue !== undefined) {
        conflicts.push({
          field,
          plexValue,
          localValue: nfoValue,
        });
      }
    }
    
    return conflicts;
  }
  
  async bulkExportToLocal(ratingKeys: string[], format: 'nfo' | 'embedded' | 'both'): Promise<BulkExportResult> {
    const result: BulkExportResult = {
      total: ratingKeys.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };
    
    for (const ratingKey of ratingKeys) {
      try {
        const item = await this.metadataManager.getMetadata(ratingKey);
        const syncResult = await this.syncToLocal(item, {
          target: 'local',
          localFormat: format,
          createBackup: true,
          overwriteExisting: true,
        });
        
        if (syncResult.success) {
          result.succeeded++;
        } else {
          result.failed++;
          result.errors.push({
            ratingKey,
            error: syncResult.errors.join(', '),
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          ratingKey,
          error: error.message,
        });
      }
    }
    
    return result;
  }
  
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  // Embedded metadata operations (requires external libraries like node-id3, mp4-parser, etc.)
  async readEmbeddedMetadata(filePath: string): Promise<EmbeddedMetadata | null> {
    // Implementation depends on file type and external libraries
    // For MP3: use node-id3
    // For MP4: use mp4-parser
    // For MKV: use matroska
    throw new Error('Not implemented - requires external libraries');
  }
  
  async writeEmbeddedMetadata(filePath: string, metadata: EmbeddedMetadata): Promise<void> {
    // Implementation depends on file type and external libraries
    throw new Error('Not implemented - requires external libraries');
  }
}
```


## UI Architecture

### Component Hierarchy

```
App
├── AuthProvider
│   └── AuthGuard
│       ├── ServerSelectionPage
│       └── MainLayout
│           ├── Sidebar
│           │   ├── UserMenu
│           │   ├── ServerInfo
│           │   └── LibraryList
│           ├── TopBar
│           │   ├── SearchBar
│           │   ├── OnlineIndicator
│           │   └── SettingsButton
│           └── ContentArea
│               ├── LibraryView
│               │   ├── LibraryHeader
│               │   ├── FilterBar
│               │   ├── ViewToggle (Grid/List)
│               │   └── ItemGrid/ItemList
│               │       └── MediaCard
│               ├── MetadataDetailView
│               │   ├── MetadataHeader
│               │   ├── ArtworkGallery
│               │   ├── MetadataForm
│               │   ├── CastCrewList
│               │   └── MediaInfoPanel
│               ├── BulkEditView
│               │   ├── SelectedItemsList
│               │   ├── BulkEditForm
│               │   └── ProgressIndicator
│               ├── CollectionsView
│               ├── PlaylistsView
│               └── SettingsView
└── Modals
    ├── ExternalSearchModal
    ├── MatchCandidatesModal
    ├── ArtworkUploadModal
    ├── ConflictResolutionModal
    └── OperationProgressModal
```

### Key UI Components

#### MediaCard Component
```typescript
interface MediaCardProps {
  item: MetadataItem;
  view: 'grid' | 'list';
  selected: boolean;
  onSelect: (ratingKey: string) => void;
  onClick: (ratingKey: string) => void;
}

const MediaCard: React.FC<MediaCardProps> = ({ item, view, selected, onSelect, onClick }) => {
  const imageUrl = useTranscodedImage(item.thumb, view === 'grid' ? 300 : 150);
  
  return (
    <div className={`media-card ${view} ${selected ? 'selected' : ''}`}>
      <div className="media-card-checkbox">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(item.ratingKey)}
        />
      </div>
      <div className="media-card-image" onClick={() => onClick(item.ratingKey)}>
        <img src={imageUrl} alt={item.title} loading="lazy" />
        {item.viewCount > 0 && (
          <div className="media-card-badge">
            <PlayedIcon />
          </div>
        )}
      </div>
      <div className="media-card-info">
        <h3 className="media-card-title">{item.title}</h3>
        {item.year && <span className="media-card-year">{item.year}</span>}
        {view === 'list' && item.summary && (
          <p className="media-card-summary">{truncate(item.summary, 150)}</p>
        )}
      </div>
    </div>
  );
};
```

#### MetadataForm Component
```typescript
interface MetadataFormProps {
  item: MetadataItem;
  onSave: (updates: MetadataUpdate) => Promise<void>;
  onCancel: () => void;
}

const MetadataForm: React.FC<MetadataFormProps> = ({ item, onSave, onCancel }) => {
  const [formData, setFormData] = useState<MetadataUpdate>({
    title: item.title,
    year: item.year,
    summary: item.summary,
    // ... other fields
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validationErrors = validateMetadata(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      setErrors({ _form: error.message });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="metadata-form">
      <FormField
        label="Title"
        value={formData.title}
        onChange={(value) => setFormData({ ...formData, title: value })}
        error={errors.title}
        required
      />
      
      <FormField
        label="Year"
        type="number"
        value={formData.year}
        onChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
        error={errors.year}
      />
      
      <FormField
        label="Summary"
        type="textarea"
        value={formData.summary}
        onChange={(value) => setFormData({ ...formData, summary: value })}
        error={errors.summary}
        rows={5}
      />
      
      {/* More fields... */}
      
      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          Save Changes
        </Button>
      </div>
    </form>
  );
};
```

#### VirtualizedList Component
```typescript
interface VirtualizedListProps {
  items: MetadataItem[];
  itemHeight: number;
  renderItem: (item: MetadataItem, index: number) => React.ReactNode;
  onLoadMore?: () => void;
}

const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  itemHeight,
  renderItem,
  onLoadMore,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.ceil((scrollTop + containerHeight) / itemHeight);
      
      setVisibleRange({ start: Math.max(0, start - 5), end: end + 5 });
      
      // Load more when near bottom
      if (onLoadMore && end >= items.length - 10) {
        onLoadMore();
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [items.length, itemHeight, onLoadMore]);
  
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const offsetY = visibleRange.start * itemHeight;
  
  return (
    <div ref={containerRef} className="virtualized-list" style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={item.ratingKey} style={{ height: itemHeight }}>
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

#### LocalMetadataSettings Component
```typescript
interface LocalMetadataSettingsProps {
  settings: AppSettings;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
}

const LocalMetadataSettings: React.FC<LocalMetadataSettingsProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState({
    metadataSaveMode: settings.metadataSaveMode,
    localMetadataFormat: settings.localMetadataFormat,
    createNfoBackups: settings.createNfoBackups,
    nfoTemplate: settings.nfoTemplate,
    autoSyncLocalChanges: settings.autoSyncLocalChanges,
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };
  
  return (
    <form onSubmit={handleSubmit} className="local-metadata-settings">
      <h3>Local Metadata Settings</h3>
      
      <FormField label="Save Mode">
        <select
          value={formData.metadataSaveMode}
          onChange={(e) => setFormData({ ...formData, metadataSaveMode: e.target.value as any })}
        >
          <option value="plex">Plex Only</option>
          <option value="local">Local Files Only</option>
          <option value="both">Both Plex and Local Files</option>
        </select>
      </FormField>
      
      {(formData.metadataSaveMode === 'local' || formData.metadataSaveMode === 'both') && (
        <>
          <FormField label="Local Format">
            <select
              value={formData.localMetadataFormat}
              onChange={(e) => setFormData({ ...formData, localMetadataFormat: e.target.value as any })}
            >
              <option value="nfo">NFO Files Only</option>
              <option value="embedded">Embedded Tags Only</option>
              <option value="both">Both NFO and Embedded</option>
            </select>
          </FormField>
          
          <FormField label="NFO Template">
            <select
              value={formData.nfoTemplate}
              onChange={(e) => setFormData({ ...formData, nfoTemplate: e.target.value as any })}
            >
              <option value="kodi">Kodi Format</option>
              <option value="emby">Emby Format</option>
              <option value="custom">Custom Template</option>
            </select>
          </FormField>
          
          <FormField label="Create Backups">
            <input
              type="checkbox"
              checked={formData.createNfoBackups}
              onChange={(e) => setFormData({ ...formData, createNfoBackups: e.target.checked })}
            />
            <span>Create backup copies before overwriting NFO files</span>
          </FormField>
          
          <FormField label="Auto-Sync Local Changes">
            <input
              type="checkbox"
              checked={formData.autoSyncLocalChanges}
              onChange={(e) => setFormData({ ...formData, autoSyncLocalChanges: e.target.checked })}
            />
            <span>Automatically detect and sync local metadata changes</span>
          </FormField>
        </>
      )}
      
      <div className="form-actions">
        <Button type="submit" variant="primary">
          Save Settings
        </Button>
      </div>
    </form>
  );
};
```

#### LocalChangeConflictModal Component
```typescript
interface LocalChangeConflictModalProps {
  item: MetadataItem;
  detection: LocalChangeDetection;
  onResolve: (resolution: 'plex' | 'local' | 'manual') => Promise<void>;
  onClose: () => void;
}

const LocalChangeConflictModal: React.FC<LocalChangeConflictModalProps> = ({
  item,
  detection,
  onResolve,
  onClose,
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'plex' | 'local'>('plex');
  
  return (
    <Modal isOpen onClose={onClose} title="Local Metadata Conflict">
      <div className="conflict-modal">
        <p>
          The local metadata file has been modified since the last sync.
          Choose which version to keep:
        </p>
        
        <div className="conflict-options">
          <label>
            <input
              type="radio"
              value="plex"
              checked={selectedResolution === 'plex'}
              onChange={() => setSelectedResolution('plex')}
            />
            <strong>Keep Plex Version</strong>
            <span className="timestamp">
              Last modified: {new Date(detection.plexModifiedAt).toLocaleString()}
            </span>
          </label>
          
          <label>
            <input
              type="radio"
              value="local"
              checked={selectedResolution === 'local'}
              onChange={() => setSelectedResolution('local')}
            />
            <strong>Keep Local Version</strong>
            <span className="timestamp">
              Last modified: {new Date(detection.nfoModifiedAt!).toLocaleString()}
            </span>
          </label>
        </div>
        
        <div className="conflict-details">
          <h4>Conflicting Fields:</h4>
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Plex Value</th>
                <th>Local Value</th>
              </tr>
            </thead>
            <tbody>
              {detection.conflicts.map((conflict, index) => (
                <tr key={index}>
                  <td>{conflict.field}</td>
                  <td>{String(conflict.plexValue)}</td>
                  <td>{String(conflict.localValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onResolve(selectedResolution)}>
            Apply Resolution
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

### Responsive Design

#### Breakpoints
```css
/* Mobile: < 768px */
@media (max-width: 767px) {
  .sidebar { display: none; }
  .grid-columns { grid-template-columns: repeat(2, 1fr); }
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
  .sidebar { width: 200px; }
  .grid-columns { grid-template-columns: repeat(3, 1fr); }
}

/* Desktop: 1024px - 1439px */
@media (min-width: 1024px) and (max-width: 1439px) {
  .sidebar { width: 250px; }
  .grid-columns { grid-template-columns: repeat(4, 1fr); }
}

/* Large Desktop: >= 1440px */
@media (min-width: 1440px) {
  .sidebar { width: 300px; }
  .grid-columns { grid-template-columns: repeat(6, 1fr); }
}
```

#### Touch Optimization
- Minimum touch target size: 44x44px
- Swipe gestures for navigation
- Pull-to-refresh for library updates
- Long-press for context menus

### Accessibility

- **Keyboard Navigation**: Full keyboard support with visible focus indicators
- **Screen Readers**: ARIA labels and roles for all interactive elements
- **Color Contrast**: WCAG AA compliance (4.5:1 for normal text)
- **Focus Management**: Proper focus trapping in modals
- **Skip Links**: Skip to main content link


## Security Considerations

### Token Storage

**Desktop (Electron)**
- Use `electron-store` with encryption enabled
- Store tokens in OS-specific secure storage:
  - Windows: Credential Manager
  - macOS: Keychain
  - Linux: Secret Service API (libsecret)

**Web (Browser)**
- Store tokens in `localStorage` (encrypted with user-specific key)
- Never expose tokens in URLs or logs
- Clear tokens on logout

**Token Encryption**
```typescript
class SecureTokenStorage {
  private encryptionKey: CryptoKey;
  
  async storeToken(userId: string, token: string): Promise<void> {
    const encrypted = await this.encrypt(token);
    localStorage.setItem(`token_${userId}`, encrypted);
  }
  
  async getToken(userId: string): Promise<string | null> {
    const encrypted = localStorage.getItem(`token_${userId}`);
    if (!encrypted) return null;
    return await this.decrypt(encrypted);
  }
  
  private async encrypt(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      dataBuffer
    );
    
    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }
  
  private async decrypt(encrypted: string): Promise<string> {
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
}
```

### Input Validation

**Sanitization**
```typescript
function sanitizeMetadataInput(input: MetadataUpdate): MetadataUpdate {
  return {
    title: input.title ? sanitizeHtml(input.title, { allowedTags: [] }) : undefined,
    summary: input.summary ? sanitizeHtml(input.summary, { allowedTags: ['br', 'p', 'i', 'b'] }) : undefined,
    year: input.year ? Math.max(1800, Math.min(2100, input.year)) : undefined,
    // ... other fields
  };
}

function validateMetadata(input: MetadataUpdate): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (input.title !== undefined) {
    if (input.title.trim().length === 0) {
      errors.title = 'Title cannot be empty';
    }
    if (input.title.length > 500) {
      errors.title = 'Title is too long (max 500 characters)';
    }
  }
  
  if (input.year !== undefined) {
    if (input.year < 1800 || input.year > 2100) {
      errors.year = 'Year must be between 1800 and 2100';
    }
  }
  
  if (input.summary !== undefined && input.summary.length > 5000) {
    errors.summary = 'Summary is too long (max 5000 characters)';
  }
  
  return errors;
}
```

### API Security

**Request Signing**
```typescript
class SecureApiClient {
  private token: string;
  private clientId: string;
  
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    
    // Add required headers
    headers.set('X-Plex-Token', this.token);
    headers.set('X-Plex-Client-Identifier', this.clientId);
    headers.set('X-Plex-Product', 'Plex Media Manager');
    
    // Add CSRF protection for mutations
    if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
      const csrfToken = await this.getCsrfToken();
      headers.set('X-CSRF-Token', csrfToken);
    }
    
    return fetch(url, {
      ...options,
      headers,
    });
  }
  
  private async getCsrfToken(): Promise<string> {
    // Implementation depends on CSRF strategy
    return sessionStorage.getItem('csrf-token') || '';
  }
}
```

### Content Security Policy

**CSP Headers (Web)**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://*.plex.direct https://*.plex.tv https://image.tmdb.org;
  connect-src 'self' https://*.plex.direct https://*.plex.tv https://api.themoviedb.org;
  font-src 'self' data:;
  media-src 'self' https://*.plex.direct;
  frame-src 'none';
  object-src 'none';
```

### Rate Limiting

```typescript
class RateLimiter {
  private requests = new Map<string, number[]>();
  private limits = {
    metadata: { requests: 100, window: 60000 },  // 100 per minute
    search: { requests: 30, window: 60000 },     // 30 per minute
    artwork: { requests: 50, window: 60000 },    // 50 per minute
  };
  
  async checkLimit(endpoint: string): Promise<boolean> {
    const now = Date.now();
    const limit = this.limits[endpoint] || this.limits.metadata;
    
    // Get recent requests
    const recent = this.requests.get(endpoint) || [];
    const windowStart = now - limit.window;
    const recentInWindow = recent.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (recentInWindow.length >= limit.requests) {
      return false;
    }
    
    // Add current request
    recentInWindow.push(now);
    this.requests.set(endpoint, recentInWindow);
    
    return true;
  }
}
```

### Data Privacy

**PII Handling**
- Never log authentication tokens
- Redact sensitive data in error reports
- Clear cache on logout
- Provide data export functionality
- Implement data deletion on account removal

**Privacy Settings**
```typescript
interface PrivacySettings {
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  shareUsageData: boolean;
  cacheUserData: boolean;
}
```


## Performance Optimization

### Caching Strategy

#### Multi-Level Cache
```
┌─────────────────────────────────────────┐
│         Memory Cache (React Query)       │
│         - 5 min stale time               │
│         - 30 min cache time              │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         IndexedDB Cache                  │
│         - Persistent offline storage     │
│         - 30 day retention               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│         Plex API                         │
│         - Source of truth                │
└─────────────────────────────────────────┘
```

#### Cache Invalidation
```typescript
class CacheInvalidationStrategy {
  // Invalidate on mutation
  async onMetadataUpdate(ratingKey: string): Promise<void> {
    await queryClient.invalidateQueries(['metadata', ratingKey]);
    await queryClient.invalidateQueries(['library', '*', 'items']);
  }
  
  // Invalidate on WebSocket notification
  async onTimelineUpdate(entry: TimelineEntry): Promise<void> {
    if (entry.type === 'metadata') {
      await queryClient.invalidateQueries(['metadata', entry.itemID]);
    }
  }
  
  // Periodic refresh for stale data
  async refreshStaleData(): Promise<void> {
    const staleQueries = queryClient.getQueryCache()
      .findAll({ stale: true });
    
    for (const query of staleQueries) {
      await queryClient.refetchQueries(query.queryKey);
    }
  }
}
```

### Image Optimization

#### Progressive Loading
```typescript
const useProgressiveImage = (src: string) => {
  const [currentSrc, setCurrentSrc] = useState<string>();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Load low-quality placeholder first
    const placeholder = src.replace(/width=\d+/, 'width=50');
    setCurrentSrc(placeholder);
    
    // Load full-quality image
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setLoading(false);
    };
  }, [src]);
  
  return { src: currentSrc, loading };
};
```

#### Image Preloading
```typescript
class ImagePreloader {
  private cache = new Map<string, Promise<void>>();
  
  preload(urls: string[]): void {
    urls.forEach(url => {
      if (!this.cache.has(url)) {
        const promise = new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Resolve even on error
          img.src = url;
        });
        this.cache.set(url, promise);
      }
    });
  }
  
  async waitForPreload(url: string): Promise<void> {
    const promise = this.cache.get(url);
    if (promise) {
      await promise;
    }
  }
}
```

### Request Optimization

#### Request Batching
```typescript
class BatchedApiClient {
  private batchQueue: Array<{ ratingKey: string; resolve: Function }> = [];
  private batchTimer: NodeJS.Timeout | null = null;
  
  async getMetadata(ratingKey: string): Promise<MetadataItem> {
    return new Promise((resolve) => {
      this.batchQueue.push({ ratingKey, resolve });
      
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.flushBatch(), 50);
      }
    });
  }
  
  private async flushBatch(): Promise<void> {
    const batch = this.batchQueue.splice(0);
    this.batchTimer = null;
    
    if (batch.length === 0) return;
    
    // Fetch all items in a single request
    const ratingKeys = batch.map(item => item.ratingKey);
    const results = await this.fetchBatch(ratingKeys);
    
    // Resolve individual promises
    batch.forEach(({ ratingKey, resolve }) => {
      resolve(results.get(ratingKey));
    });
  }
  
  private async fetchBatch(ratingKeys: string[]): Promise<Map<string, MetadataItem>> {
    // Implementation depends on API support for batch requests
    const results = new Map<string, MetadataItem>();
    
    // Fallback to individual requests if batch not supported
    await Promise.all(
      ratingKeys.map(async (key) => {
        const item = await this.fetchSingle(key);
        results.set(key, item);
      })
    );
    
    return results;
  }
}
```

#### Request Deduplication
```typescript
class DeduplicatedApiClient {
  private pendingRequests = new Map<string, Promise<any>>();
  
  async request<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Return existing promise if request is in flight
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }
    
    // Create new request
    const promise = fetcher().finally(() => {
      this.pendingRequests.delete(key);
    });
    
    this.pendingRequests.set(key, promise);
    return promise;
  }
}
```

### Database Optimization

#### Indexed Queries
```typescript
// Create indexes for common queries
const db = await openDB('aio-media-manager', 1, {
  upgrade(db) {
    // Metadata store
    const metadataStore = db.createObjectStore('metadata', {
      keyPath: 'ratingKey',
    });
    metadataStore.createIndex('sectionId', 'sectionId');
    metadataStore.createIndex('type', 'type');
    metadataStore.createIndex('cachedAt', 'cachedAt');
    metadataStore.createIndex('dirty', 'dirty');
    
    // Compound index for common queries
    metadataStore.createIndex('sectionId_type', ['sectionId', 'type']);
    
    // Offline changes store
    const changesStore = db.createObjectStore('offlineChanges', {
      keyPath: 'id',
    });
    changesStore.createIndex('timestamp', 'timestamp');
    changesStore.createIndex('ratingKey', 'ratingKey');
    changesStore.createIndex('synced', 'synced');
  },
});
```

#### Bulk Operations
```typescript
async function bulkCacheMetadata(items: MetadataItem[]): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction('metadata', 'readwrite');
  
  // Use transaction for atomic bulk insert
  await Promise.all(
    items.map(item => tx.store.put({
      ratingKey: item.ratingKey,
      sectionId: item.sectionId,
      type: item.type,
      data: item,
      cachedAt: Date.now(),
      lastModified: item.updatedAt,
      dirty: false,
    }))
  );
  
  await tx.done;
}
```

### Memory Management

#### Cleanup Strategy
```typescript
class MemoryManager {
  private cleanupInterval = 5 * 60 * 1000; // 5 minutes
  
  startCleanup(): void {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }
  
  private cleanup(): void {
    // Clear old query cache
    const queries = queryClient.getQueryCache().getAll();
    const now = Date.now();
    
    queries.forEach(query => {
      const age = now - (query.state.dataUpdatedAt || 0);
      if (age > 30 * 60 * 1000) { // 30 minutes
        queryClient.removeQueries(query.queryKey);
      }
    });
    
    // Clear old IndexedDB entries
    this.cleanupDatabase();
  }
  
  private async cleanupDatabase(): Promise<void> {
    const db = await getDatabase();
    const tx = db.transaction('metadata', 'readwrite');
    const index = tx.store.index('cachedAt');
    
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    const oldEntries = await index.getAll(IDBKeyRange.upperBound(cutoff));
    
    await Promise.all(
      oldEntries.map(entry => tx.store.delete(entry.ratingKey))
    );
    
    await tx.done;
  }
}
```

### Bundle Optimization

#### Code Splitting
```typescript
// Route-based code splitting
const LibraryView = lazy(() => import('./views/LibraryView'));
const MetadataDetailView = lazy(() => import('./views/MetadataDetailView'));
const SettingsView = lazy(() => import('./views/SettingsView'));

// Component-based code splitting
const ExternalSearchModal = lazy(() => import('./modals/ExternalSearchModal'));
const BulkEditView = lazy(() => import('./views/BulkEditView'));
```

#### Tree Shaking
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
        },
      },
    },
  },
});
```


## Deployment Strategy

### Build Configuration

#### Development Build
```json
{
  "scripts": {
    "dev": "vite",
    "dev:electron": "concurrently \"vite\" \"electron .\"",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts,.tsx",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

#### Production Build
```json
{
  "scripts": {
    "build": "tsc && vite build",
    "build:electron": "npm run build && electron-builder",
    "preview": "vite preview"
  }
}
```

### Electron Packaging

#### electron-builder Configuration
```json
{
  "build": {
    "appId": "com.plexmediamanager.app",
    "productName": "Plex Media Manager",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.utilities",
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    "win": {
      "target": ["nsis", "portable"],
      "icon": "build/icon.ico"
    },
    "linux": {
      "target": ["AppImage", "deb", "rpm"],
      "icon": "build/icon.png",
      "category": "Utility"
    },
    "publish": {
      "provider": "github",
      "owner": "AuXBoX",
      "repo": "AIO-Media-Manager"
    }
  }
}
```

### Web Deployment

#### Static Hosting (Netlify/Vercel)
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

#### Docker Container
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

### Auto-Update System

#### Electron Auto-Updater
```typescript
import { autoUpdater } from 'electron-updater';
import { app, dialog } from 'electron';

class AutoUpdateManager {
  constructor() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    this.setupListeners();
  }
  
  private setupListeners(): void {
    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. Would you like to download it now?`,
        buttons: ['Download', 'Later'],
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });
    
    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The application will restart to install the update.',
        buttons: ['Restart Now', 'Later'],
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
    
    autoUpdater.on('error', (error) => {
      dialog.showErrorBox('Update Error', error.message);
    });
  }
  
  checkForUpdates(): void {
    autoUpdater.checkForUpdates();
  }
}
```

### Release Process

#### Version Management
```json
{
  "version": "1.0.0",
  "scripts": {
    "version:patch": "npm version patch",
    "version:minor": "npm version minor",
    "version:major": "npm version major",
    "release": "npm run build && npm run version:patch && git push --follow-tags"
  }
}
```

#### CI/CD Pipeline (GitHub Actions)
```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: web-build
          path: dist/

  build-electron:
    strategy:
      matrix:
        os: [macos-latest, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build:electron
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - uses: actions/upload-artifact@v3
        with:
          name: electron-${{ matrix.os }}
          path: dist-electron/

  release:
    needs: [build-web, build-electron]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            electron-*/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Monitoring and Analytics

#### Error Tracking (Sentry)
```typescript
import * as Sentry from '@sentry/electron';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: `aio-media-manager@${app.getVersion()}`,
  beforeSend(event, hint) {
    // Redact sensitive data
    if (event.request?.headers) {
      delete event.request.headers['X-Plex-Token'];
    }
    return event;
  },
});
```

#### Usage Analytics
```typescript
interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

class AnalyticsManager {
  private enabled: boolean;
  
  constructor() {
    this.enabled = this.getPrivacySettings().enableAnalytics;
  }
  
  trackEvent(event: AnalyticsEvent): void {
    if (!this.enabled) return;
    
    // Send to analytics service (e.g., Plausible, Matomo)
    this.send({
      ...event,
      timestamp: Date.now(),
      version: app.getVersion(),
    });
  }
  
  trackPageView(path: string): void {
    this.trackEvent({
      category: 'Navigation',
      action: 'Page View',
      label: path,
    });
  }
  
  trackError(error: Error): void {
    this.trackEvent({
      category: 'Error',
      action: error.name,
      label: error.message,
    });
  }
}
```

### Backup and Recovery

#### Settings Backup
```typescript
class SettingsBackupManager {
  async exportSettings(): Promise<string> {
    const settings = await this.getAllSettings();
    const backup = {
      version: app.getVersion(),
      timestamp: Date.now(),
      settings,
    };
    
    return JSON.stringify(backup, null, 2);
  }
  
  async importSettings(backupJson: string): Promise<void> {
    const backup = JSON.parse(backupJson);
    
    // Validate backup
    if (!backup.version || !backup.settings) {
      throw new Error('Invalid backup file');
    }
    
    // Restore settings
    await this.restoreSettings(backup.settings);
  }
  
  async autoBackup(): Promise<void> {
    const backup = await this.exportSettings();
    const backupPath = path.join(app.getPath('userData'), 'backups');
    const filename = `settings-${Date.now()}.json`;
    
    await fs.promises.mkdir(backupPath, { recursive: true });
    await fs.promises.writeFile(
      path.join(backupPath, filename),
      backup
    );
    
    // Keep only last 10 backups
    await this.cleanupOldBackups(backupPath, 10);
  }
}
```


## Migration and Compatibility

### Database Migrations

```typescript
interface Migration {
  version: number;
  up: (db: IDBDatabase) => Promise<void>;
  down: (db: IDBDatabase) => Promise<void>;
}

const migrations: Migration[] = [
  {
    version: 1,
    async up(db) {
      // Initial schema
      const metadataStore = db.createObjectStore('metadata', {
        keyPath: 'ratingKey',
      });
      metadataStore.createIndex('sectionId', 'sectionId');
      metadataStore.createIndex('type', 'type');
    },
    async down(db) {
      db.deleteObjectStore('metadata');
    },
  },
  {
    version: 2,
    async up(db) {
      // Add offline changes store
      const changesStore = db.createObjectStore('offlineChanges', {
        keyPath: 'id',
      });
      changesStore.createIndex('timestamp', 'timestamp');
      changesStore.createIndex('synced', 'synced');
    },
    async down(db) {
      db.deleteObjectStore('offlineChanges');
    },
  },
];

class DatabaseMigrationManager {
  async migrate(currentVersion: number, targetVersion: number): Promise<void> {
    const db = await openDB('aio-media-manager', targetVersion, {
      upgrade(db, oldVersion, newVersion, transaction) {
        const applicableMigrations = migrations.filter(
          m => m.version > oldVersion && m.version <= (newVersion || 0)
        );
        
        for (const migration of applicableMigrations) {
          migration.up(db);
        }
      },
    });
    
    return db;
  }
}
```

### Settings Migration

```typescript
class SettingsMigrationManager {
  async migrateSettings(oldVersion: string, newVersion: string): Promise<void> {
    const settings = await this.loadSettings();
    
    // Version-specific migrations
    if (this.compareVersions(oldVersion, '1.0.0') < 0) {
      // Migrate from pre-1.0 format
      settings.theme = settings.darkMode ? 'dark' : 'light';
      delete settings.darkMode;
    }
    
    if (this.compareVersions(oldVersion, '1.1.0') < 0) {
      // Add new settings with defaults
      settings.autoSync = settings.autoSync ?? true;
      settings.syncInterval = settings.syncInterval ?? 15;
    }
    
    await this.saveSettings(settings);
  }
  
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    
    return 0;
  }
}
```

### API Version Compatibility

```typescript
class ApiVersionManager {
  private minSupportedVersion = '1.40.0';
  private recommendedVersion = '1.42.0';
  
  async checkCompatibility(serverVersion: string): Promise<CompatibilityResult> {
    const comparison = this.compareVersions(serverVersion, this.minSupportedVersion);
    
    if (comparison < 0) {
      return {
        compatible: false,
        message: `Server version ${serverVersion} is not supported. Minimum version: ${this.minSupportedVersion}`,
        severity: 'error',
      };
    }
    
    const recommendedComparison = this.compareVersions(serverVersion, this.recommendedVersion);
    if (recommendedComparison < 0) {
      return {
        compatible: true,
        message: `Server version ${serverVersion} is supported but outdated. Recommended version: ${this.recommendedVersion}`,
        severity: 'warning',
      };
    }
    
    return {
      compatible: true,
      message: 'Server version is fully supported',
      severity: 'info',
    };
  }
}

interface CompatibilityResult {
  compatible: boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}
```

## Future Enhancements

### Phase 2 Features

#### Advanced Metadata Editing
- Custom metadata fields
- Metadata templates for bulk operations
- Metadata history and rollback
- Metadata comparison between items

#### Enhanced Search
- Fuzzy search with typo tolerance
- Advanced query builder
- Saved searches with notifications
- Cross-library search

#### Collaboration Features
- Share collections with other users
- Collaborative playlists
- Metadata change suggestions
- Comment system for items

#### Media Analysis
- Duplicate detection
- Quality analysis and recommendations
- Missing episode detection
- Artwork quality scoring

### Phase 3 Features

#### AI-Powered Features
- Automatic metadata enhancement
- Smart collection suggestions
- Content recommendations
- Image upscaling for artwork

#### Advanced Workflows
- Automation rules (if-then conditions)
- Scheduled tasks
- Webhook integrations
- Custom scripts support

#### Mobile Applications
- Native iOS app
- Native Android app
- Tablet-optimized interfaces
- Offline-first mobile experience

### Extensibility

#### Plugin System
```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  
  // Lifecycle hooks
  onLoad(): Promise<void>;
  onUnload(): Promise<void>;
  
  // Extension points
  metadataProviders?: MetadataProvider[];
  contextMenuItems?: ContextMenuItem[];
  settingsPanels?: SettingsPanel[];
}

interface PluginManager {
  loadPlugin(plugin: Plugin): Promise<void>;
  unloadPlugin(pluginId: string): Promise<void>;
  getLoadedPlugins(): Plugin[];
  enablePlugin(pluginId: string): Promise<void>;
  disablePlugin(pluginId: string): Promise<void>;
}
```

#### Custom Metadata Providers
```typescript
interface CustomMetadataProvider extends ExternalMetadataProvider {
  id: string;
  name: string;
  icon: string;
  
  // Configuration
  configure(settings: Record<string, any>): Promise<void>;
  getConfigSchema(): ConfigSchema;
  
  // Capabilities
  supportedTypes: MediaType[];
  requiresApiKey: boolean;
}
```

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| Rating Key | Unique identifier for a metadata item in Plex (e.g., "12345") |
| Library Section | A collection of media items of a specific type (Movies, TV Shows, Music) |
| Metadata Item | A movie, TV show, season, episode, artist, album, or track |
| Plex Home | Multi-user feature allowing multiple profiles on one Plex account |
| Authentication Token | JWT or legacy token used to authenticate with Plex services |
| Artwork Asset | Poster, background art, banner, or other visual media |
| External Metadata Provider | Third-party metadata source (TMDB, IMDB, MusicBrainz) |
| Metadata Cache | Local storage of metadata for offline access |
| Sync | Process of synchronizing offline changes with the server |
| Bulk Operation | Operation performed on multiple items simultaneously |

### API Endpoints Reference

#### Authentication
- `POST https://plex.tv/api/v2/pins` - Generate PIN
- `GET https://plex.tv/api/v2/pins/{id}` - Check PIN status
- `GET https://plex.tv/api/v2/user` - Get user info
- `GET https://plex.tv/api/v2/resources` - Get servers
- `GET https://plex.tv/api/v2/home/users` - Get home users
- `POST https://plex.tv/api/v2/home/users/{id}/switch` - Switch user

#### Library
- `GET /library/sections` - List libraries
- `GET /library/sections/{id}` - Get library details
- `GET /library/sections/{id}/all` - Get library items
- `GET /library/sections/{id}/recentlyAdded` - Recently added
- `GET /library/sections/{id}/refresh` - Refresh library

#### Metadata
- `GET /library/metadata/{key}` - Get metadata
- `PUT /library/metadata/{key}` - Update metadata
- `GET /library/metadata/{key}/children` - Get children
- `PUT /library/metadata/{key}/match` - Match metadata
- `PUT /library/metadata/{key}/unmatch` - Unmatch metadata
- `PUT /library/metadata/{key}/refresh` - Refresh metadata

#### Playlists
- `GET /playlists` - List playlists
- `POST /playlists` - Create playlist
- `GET /playlists/{id}/items` - Get playlist items
- `PUT /playlists/{id}/items` - Add to playlist
- `DELETE /playlists/{id}/items/{itemId}` - Remove from playlist

#### Collections
- `PUT /library/collections/{id}/items` - Add to collection
- `DELETE /library/collections/{id}/items/{itemId}` - Remove from collection

#### Search
- `GET /hubs/search` - Hub search
- `GET /library/sections/{id}/search` - Library search

### Configuration Files

#### Application Settings
```json
{
  "server": {
    "selectedServerId": "abc123",
    "lastConnectedServer": {
      "machineIdentifier": "abc123",
      "name": "My Plex Server",
      "connections": [...]
    }
  },
  "user": {
    "currentUserId": "user123"
  },
  "ui": {
    "theme": "dark",
    "defaultView": "grid",
    "gridColumns": 6,
    "thumbnailQuality": "high"
  },
  "cache": {
    "enabled": true,
    "maxCacheSize": 1024,
    "cacheRetentionDays": 30,
    "autoSync": true,
    "syncInterval": 15
  },
  "performance": {
    "pageSize": 50,
    "imagePreloadCount": 10,
    "enableLazyLoading": true
  },
  "privacy": {
    "enableAnalytics": false,
    "enableCrashReporting": true,
    "shareUsageData": false
  }
}
```

### Development Setup

#### Prerequisites
- Node.js 18+
- npm 9+
- Git

#### Installation
```bash
# Clone repository
git clone https://github.com/AuXBoX/AIO-Media-Manager.git
cd AIO-Media-Manager

# Install dependencies
npm install

# Start development server
npm run dev

# Start Electron app
npm run dev:electron
```

#### Environment Variables
```env
# .env.development
VITE_PLEX_CLIENT_ID=your-client-id
VITE_TMDB_API_KEY=your-tmdb-key
VITE_SENTRY_DSN=your-sentry-dsn
```

### Testing

#### Run Tests
```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests in UI mode
npm run test:e2e:ui
```

### Contributing

#### Code Style
- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Write tests for new features
- Update documentation

#### Pull Request Process
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation
4. Submit PR with description
5. Address review feedback
6. Merge after approval

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Status:** Ready for Implementation

