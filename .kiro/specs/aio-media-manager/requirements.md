# Requirements Document

## Introduction

The Plex Media Manager is a desktop and web application for viewing and editing metadata for movies, TV shows, and music in Plex Media Server libraries. The application provides functionality similar to TinyMediaManager, enabling both individual and bulk metadata editing operations. It supports multiple Plex Home users, offline metadata caching, and integration with external metadata sources (TMDB, IMDB, etc.).

## Glossary

- **Plex_Media_Server**: The Plex Media Server instance that hosts media libraries
- **Media_Manager**: The Plex Media Manager application (this system)
- **Metadata_Item**: A movie, TV show, season, episode, artist, album, or track in a Plex library
- **Library_Section**: A collection of media items of a specific type (Movies, TV Shows, Music)
- **Rating_Key**: Unique identifier for a metadata item in Plex
- **Plex_Home_User**: A user profile within a Plex Home account
- **External_Metadata_Provider**: Third-party metadata source (TMDB, IMDB, MusicBrainz, etc.)
- **Metadata_Cache**: Local storage of metadata for offline access
- **Artwork_Asset**: Poster, background art, banner, or other visual media associated with a metadata item
- **Plex_API**: The RESTful API provided by Plex Media Server
- **Authentication_Token**: JWT or legacy token used to authenticate with Plex services
- **NFO_File**: XML metadata file stored alongside media files (Kodi/Emby format)
- **Embedded_Metadata**: Metadata tags written directly into media file containers (ID3, MP4 atoms, MKV tags)
- **Source_Media_Folder**: The file system directory containing the original media files
- **Metadata_Save_Mode**: Configuration option for where to save metadata (Plex only, Local files only, or Both)

## Requirements

### Requirement 1: Server Connection and Authentication

**User Story:** As a user, I want to connect to my Plex Media Server and authenticate, so that I can access and manage my media libraries.

#### Acceptance Criteria

1. THE Media_Manager SHALL support PIN-based OAuth authentication flow with Plex
2. WHEN a user completes authentication, THE Media_Manager SHALL retrieve and store the Authentication_Token securely
3. THE Media_Manager SHALL discover available Plex_Media_Server instances for the authenticated user
4. WHEN multiple servers are available, THE Media_Manager SHALL allow the user to select a server
5. THE Media_Manager SHALL validate the Authentication_Token before making API requests
6. IF the Authentication_Token is invalid or expired, THEN THE Media_Manager SHALL prompt the user to re-authenticate
7. THE Media_Manager SHALL support both local and remote server connections

### Requirement 2: Multi-User Support

**User Story:** As a Plex Home administrator, I want to manage media for different Plex Home users, so that each user can have their own playlists and watch history.

#### Acceptance Criteria

1. THE Media_Manager SHALL retrieve the list of Plex_Home_User accounts from the authenticated admin account
2. THE Media_Manager SHALL allow switching between Plex_Home_User contexts
3. WHEN switching users, THE Media_Manager SHALL obtain the Authentication_Token for the selected Plex_Home_User
4. THE Media_Manager SHALL display user-specific data (playlists, watch history) based on the active Plex_Home_User
5. THE Media_Manager SHALL store Authentication_Token values for multiple Plex_Home_User accounts securely
6. THE Media_Manager SHALL indicate which Plex_Home_User is currently active in the user interface

### Requirement 3: Library Discovery and Navigation

**User Story:** As a user, I want to browse my media libraries, so that I can find and select items to view or edit.

#### Acceptance Criteria

1. THE Media_Manager SHALL retrieve all Library_Section entries from the Plex_Media_Server
2. THE Media_Manager SHALL display libraries organized by media type (Movies, TV Shows, Music)
3. THE Media_Manager SHALL retrieve and display item counts for each Library_Section
4. WHEN a user selects a Library_Section, THE Media_Manager SHALL display the items within that library
5. THE Media_Manager SHALL support pagination when displaying large libraries
6. THE Media_Manager SHALL display library items in a grid or list view with thumbnails and basic metadata

### Requirement 4: Metadata Viewing

**User Story:** As a user, I want to view detailed metadata for media items, so that I can see all available information about movies, shows, and music.

#### Acceptance Criteria

1. WHEN a user selects a Metadata_Item, THE Media_Manager SHALL retrieve and display complete metadata from the Plex_API
2. THE Media_Manager SHALL display core metadata fields (title, year, summary, rating, genres, cast, crew)
3. FOR TV shows, THE Media_Manager SHALL display season and episode information hierarchically
4. FOR music, THE Media_Manager SHALL display artist, album, and track information hierarchically
5. THE Media_Manager SHALL display all Artwork_Asset entries associated with the Metadata_Item
6. THE Media_Manager SHALL display technical media information (codec, resolution, bitrate, duration)
7. THE Media_Manager SHALL display user-specific data (play count, last played date, user rating)

### Requirement 5: Individual Metadata Editing

**User Story:** As a user, I want to edit metadata for individual items, so that I can correct or enhance information for specific movies, shows, or music.

#### Acceptance Criteria

1. THE Media_Manager SHALL allow editing of text fields (title, summary, tagline, studio)
2. THE Media_Manager SHALL allow editing of date fields (release date, air date)
3. THE Media_Manager SHALL allow editing of numeric fields (year, rating, duration)
4. THE Media_Manager SHALL allow adding, removing, and reordering genres
5. THE Media_Manager SHALL allow adding, removing, and editing cast and crew entries
6. WHEN a user saves changes, THE Media_Manager SHALL send updates to the Plex_API using PUT requests to the metadata endpoint
7. IF the update fails, THEN THE Media_Manager SHALL display an error message and retain the unsaved changes
8. WHEN the update succeeds, THE Media_Manager SHALL refresh the displayed metadata

### Requirement 6: Bulk Metadata Editing

**User Story:** As a user, I want to edit metadata for multiple items at once, so that I can efficiently update common fields across many items.

#### Acceptance Criteria

1. THE Media_Manager SHALL allow selecting multiple Metadata_Item entries in a library view
2. THE Media_Manager SHALL display a bulk edit interface showing fields common to all selected items
3. THE Media_Manager SHALL allow editing fields that apply to all selected items (genres, studio, content rating)
4. WHEN a user applies bulk changes, THE Media_Manager SHALL send update requests for each selected Metadata_Item
5. THE Media_Manager SHALL display progress during bulk update operations
6. THE Media_Manager SHALL report success and failure counts after bulk operations complete
7. IF some updates fail, THEN THE Media_Manager SHALL display which items failed and allow retry

### Requirement 7: Artwork Management

**User Story:** As a user, I want to manage posters, backgrounds, and other artwork, so that my media library has visually appealing and accurate images.

#### Acceptance Criteria

1. THE Media_Manager SHALL display all available Artwork_Asset entries for a Metadata_Item
2. THE Media_Manager SHALL allow uploading custom artwork from local files
3. THE Media_Manager SHALL allow selecting artwork from Plex_API image search results
4. THE Media_Manager SHALL allow deleting custom artwork
5. WHEN a user uploads artwork, THE Media_Manager SHALL use the Plex_API artwork upload endpoint
6. THE Media_Manager SHALL support artwork types (poster, background, banner, thumb)
7. THE Media_Manager SHALL display artwork previews at appropriate sizes using the Plex image transcoding API

### Requirement 8: External Metadata Search

**User Story:** As a user, I want to search external metadata sources, so that I can find and import accurate metadata from TMDB, IMDB, and other providers.

#### Acceptance Criteria

1. THE Media_Manager SHALL provide a search interface for External_Metadata_Provider sources
2. THE Media_Manager SHALL support searching TMDB for movies and TV shows
3. THE Media_Manager SHALL support searching IMDB for movies and TV shows
4. THE Media_Manager SHALL support searching MusicBrainz for music metadata
5. WHEN a user performs a search, THE Media_Manager SHALL display results with thumbnails and basic information
6. THE Media_Manager SHALL allow previewing full metadata from search results before importing
7. WHEN a user selects a search result, THE Media_Manager SHALL import the metadata and update the Metadata_Item via the Plex_API

### Requirement 9: Metadata Matching and Fixing

**User Story:** As a user, I want to match or rematch items with correct metadata sources, so that I can fix incorrectly identified media.

#### Acceptance Criteria

1. THE Media_Manager SHALL allow triggering a metadata match operation for a Metadata_Item
2. THE Media_Manager SHALL use the Plex_API match endpoint to find potential matches
3. THE Media_Manager SHALL display match candidates with confidence scores and metadata previews
4. WHEN a user selects a match, THE Media_Manager SHALL apply the match using the Plex_API
5. THE Media_Manager SHALL allow unmatching a Metadata_Item to reset its metadata
6. THE Media_Manager SHALL support bulk matching operations for multiple items

### Requirement 10: Offline Metadata Caching

**User Story:** As a user, I want to cache metadata locally, so that I can browse and edit metadata when my Plex server is unavailable.

#### Acceptance Criteria

1. THE Media_Manager SHALL cache metadata for Library_Section entries locally
2. THE Media_Manager SHALL cache Artwork_Asset entries and thumbnails locally
3. WHEN the Plex_Media_Server is unreachable, THE Media_Manager SHALL load metadata from the Metadata_Cache
4. THE Media_Manager SHALL indicate when displaying cached data versus live data
5. THE Media_Manager SHALL allow editing cached metadata offline
6. WHEN the Plex_Media_Server becomes available, THE Media_Manager SHALL synchronize offline changes to the server
7. THE Media_Manager SHALL detect and resolve conflicts between cached and server metadata

### Requirement 11: Search and Filtering

**User Story:** As a user, I want to search and filter my media libraries, so that I can quickly find specific items or groups of items.

#### Acceptance Criteria

1. THE Media_Manager SHALL provide a search interface using the Plex_API hub search endpoint
2. THE Media_Manager SHALL support filtering by genre, year, rating, and other metadata fields
3. THE Media_Manager SHALL support sorting by title, date added, release date, and rating
4. THE Media_Manager SHALL display search results with thumbnails and key metadata
5. THE Media_Manager SHALL support saving filter combinations as presets
6. THE Media_Manager SHALL apply filters and sorts using the Plex media query language

### Requirement 12: Collection Management

**User Story:** As a user, I want to create and manage collections, so that I can group related media items together.

#### Acceptance Criteria

1. THE Media_Manager SHALL display existing collections from the Plex_Media_Server
2. THE Media_Manager SHALL allow creating new collections
3. THE Media_Manager SHALL allow adding Metadata_Item entries to collections
4. THE Media_Manager SHALL allow removing items from collections
5. THE Media_Manager SHALL allow reordering items within collections
6. THE Media_Manager SHALL allow editing collection metadata (title, summary, artwork)
7. WHEN collection changes are made, THE Media_Manager SHALL update the Plex_Media_Server using the collection API endpoints

### Requirement 13: Playlist Management

**User Story:** As a user, I want to manage playlists, so that I can organize music and video content into custom playback lists.

#### Acceptance Criteria

1. THE Media_Manager SHALL retrieve and display playlists for the active Plex_Home_User
2. THE Media_Manager SHALL allow creating new playlists
3. THE Media_Manager SHALL allow adding items to playlists
4. THE Media_Manager SHALL allow removing items from playlists
5. THE Media_Manager SHALL allow reordering items within playlists
6. THE Media_Manager SHALL allow editing playlist metadata (title, summary)
7. THE Media_Manager SHALL support both audio and video playlists

### Requirement 14: Trailer Management

**User Story:** As a user, I want to manage trailers for movies and TV shows, so that I can add or remove preview content.

#### Acceptance Criteria

1. THE Media_Manager SHALL display existing trailers for a Metadata_Item
2. THE Media_Manager SHALL allow adding trailer URLs to a Metadata_Item
3. THE Media_Manager SHALL allow removing trailers from a Metadata_Item
4. WHEN a user adds a trailer, THE Media_Manager SHALL use the Plex_API extras endpoint
5. THE Media_Manager SHALL validate trailer URLs before adding them

### Requirement 15: Library Statistics and Reports

**User Story:** As a user, I want to view statistics about my libraries, so that I can understand my media collection.

#### Acceptance Criteria

1. THE Media_Manager SHALL display total counts for each Library_Section (movies, shows, episodes, albums, tracks)
2. THE Media_Manager SHALL display storage statistics (total size, average file size)
3. THE Media_Manager SHALL display metadata completeness statistics (items missing posters, summaries, etc.)
4. THE Media_Manager SHALL display quality statistics (resolution distribution, codec distribution)
5. THE Media_Manager SHALL allow exporting statistics as reports

### Requirement 16: Batch Operations

**User Story:** As a user, I want to perform batch operations on media items, so that I can efficiently manage large libraries.

#### Acceptance Criteria

1. THE Media_Manager SHALL support batch refresh operations for metadata
2. THE Media_Manager SHALL support batch artwork download operations
3. THE Media_Manager SHALL support batch matching operations
4. THE Media_Manager SHALL display progress for batch operations with item counts and estimated time
5. THE Media_Manager SHALL allow canceling batch operations in progress
6. THE Media_Manager SHALL log batch operation results for review

### Requirement 17: User Interface Responsiveness

**User Story:** As a user, I want a responsive interface, so that I can use the application on different screen sizes and platforms.

#### Acceptance Criteria

1. THE Media_Manager SHALL provide a responsive layout that adapts to screen size
2. THE Media_Manager SHALL support desktop window resizing
3. THE Media_Manager SHALL provide touch-friendly controls for tablet devices
4. THE Media_Manager SHALL maintain usability at minimum supported screen resolution
5. THE Media_Manager SHALL use progressive loading for large lists and images

### Requirement 18: Settings and Preferences

**User Story:** As a user, I want to configure application settings, so that I can customize the behavior and appearance.

#### Acceptance Criteria

1. THE Media_Manager SHALL provide a settings interface
2. THE Media_Manager SHALL allow configuring default External_Metadata_Provider preferences
3. THE Media_Manager SHALL allow configuring cache size limits and retention policies
4. THE Media_Manager SHALL allow configuring default view modes (grid vs list)
5. THE Media_Manager SHALL allow configuring thumbnail quality and size preferences
6. THE Media_Manager SHALL persist settings between application sessions

### Requirement 19: Error Handling and Recovery

**User Story:** As a user, I want clear error messages and recovery options, so that I can resolve issues when they occur.

#### Acceptance Criteria

1. WHEN the Plex_Media_Server is unreachable, THE Media_Manager SHALL display a connection error message
2. WHEN an API request fails, THE Media_Manager SHALL display the error reason
3. THE Media_Manager SHALL provide retry options for failed operations
4. THE Media_Manager SHALL log errors for troubleshooting
5. WHEN authentication fails, THE Media_Manager SHALL guide the user through re-authentication
6. THE Media_Manager SHALL validate user input and display validation errors before submitting to the API

### Requirement 20: Performance Optimization

**User Story:** As a user, I want fast application performance, so that I can work efficiently with large media libraries.

#### Acceptance Criteria

1. THE Media_Manager SHALL use pagination to limit API response sizes
2. THE Media_Manager SHALL implement lazy loading for images and thumbnails
3. THE Media_Manager SHALL cache frequently accessed data in memory
4. THE Media_Manager SHALL use the Plex_API response customization features to exclude unnecessary fields
5. THE Media_Manager SHALL implement request debouncing for search operations
6. THE Media_Manager SHALL load library views within 2 seconds for libraries under 10,000 items

### Requirement 21: Local Metadata File Management

**User Story:** As a user, I want to save metadata changes to local files alongside my media, so that my metadata is portable and persists independently of Plex.

#### Acceptance Criteria

1. THE Media_Manager SHALL support saving metadata to NFO files (Kodi/Emby format) in the source media folder
2. THE Media_Manager SHALL support writing metadata tags directly to media files (MP3 ID3, MP4 atoms, MKV tags)
3. THE Media_Manager SHALL allow the user to choose between three save modes: Plex only, Local files only, or Both
4. WHEN saving to local files, THE Media_Manager SHALL preserve existing file permissions and ownership
5. THE Media_Manager SHALL support reading existing NFO files and embedded tags to populate metadata fields
6. THE Media_Manager SHALL detect when local metadata differs from Plex metadata and offer to sync
7. THE Media_Manager SHALL validate file system access before attempting to write local metadata
8. IF file system access is denied, THEN THE Media_Manager SHALL display an error and fall back to Plex-only mode
9. THE Media_Manager SHALL support NFO file formats for movies (movie.nfo), TV shows (tvshow.nfo), episodes (episode.nfo), and music (artist.nfo, album.nfo)
10. THE Media_Manager SHALL allow bulk export of metadata to local files for entire libraries
11. THE Media_Manager SHALL create backup copies of existing NFO files before overwriting
12. THE Media_Manager SHALL support custom NFO templates for different metadata schemas

