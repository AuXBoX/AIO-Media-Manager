# AIO Media Manager

Feel free to donate 
[Tip Jar](https://www.paypal.com/donate/?business=6H5L2S8SAQWBW&no_recurring=0&currency_code=AUD)

A powerful desktop and web application for viewing and editing metadata for movies, TV shows, and music in Plex Media Server libraries.

## Recent Improvements

### Playlist Features (New)
- **Built-in music playback** - Audio player with full controls and persistent player bar
- **Advanced playlist management** - Drag-and-drop reordering, add/remove tracks, bulk operations
- **Import playlists** - Import from CSV or text files with automatic track matching
- **Cover art management** - Upload custom covers or select from album art
- **Track matching** - Find better matches for tracks in your library
- **Missing track detection** - Identify and export tracks not in library
- **Keyboard shortcuts** - Ctrl+A to select all, Delete to remove, Escape to clear

### UI/UX Enhancements
- **Default list view** - First install now shows list view for better information density
- **Trailer resolution badges** - Color-coded badges showing available resolutions
- **Compact modal headers** - Reduced wasted space in dialog headers
- **Alphabet navigation** - Instant jump to any letter in large libraries
- **Tree view for music and TV shows** - Hierarchical navigation with expand/collapse
- **Resizable split panes** - Adjust library list and detail panel sizes
- **Adjustable poster sizes** - Real-time slider to resize posters
- **Square images for music** - Proper aspect ratio for artists, albums, and tracks
- **Optimized hover effects** - Removed transitions for instant responsiveness

### Performance Optimizations
- **Hardware-accelerated scrolling** - Smooth scrolling on libraries with 7000+ items
- **CSS containment** - Optimized rendering for individual items
- **Removed console logging** - Eliminated performance bottlenecks from debug logs
- **Background preloading** - Loads all items for instant alphabet navigation
- **Optimized scroll handlers** - Reduced frequency of scroll event processing

### Metadata Features
- **Provider-specific refresh** - MusicBrainz/Discogs for music, TVDB for TV shows
- **Music video support** - Search, download, and manage music videos for tracks
- **Enhanced image search** - Search multiple providers with tabbed interface
- **Trailer management** - Automatic naming and local file detection
- **Subtitle support** - Search and download subtitles from OpenSubtitles

## Features

### Library Management
- Browse and search your entire Plex media library
- Grid and list view modes with customizable layouts
- **Hierarchical tree view for TV shows and music** - Navigate shows/seasons/episodes and artists/albums/tracks
- **Artists/Albums toggle for music libraries** - Switch between viewing artists or albums
- Infinite scroll for seamless browsing with background preloading
- Advanced filtering and sorting options
- **Alphabet jump list for instant navigation** - Click any letter to jump to that section
- **Optimized scrolling performance** - Hardware-accelerated smooth scrolling for large libraries
- Customizable column visibility and ordering
- **Adjustable poster sizes** - Slider to resize posters from 80px to 320px
- **Resizable split panes** - Adjust the size of library list and detail panel

### Metadata Refresh & Editing
- **Metadata refresh workflow** with multi-step process and detailed review
- **Provider-specific refresh options** - Choose MusicBrainz/Discogs for music, TVDB for TV shows
- Search and match content from TMDB, TVDB, Fanart.tv, MusicBrainz, and Discogs
- **Detailed review screen** - Preview all changes before applying (metadata, images, trailers, cast)
- **Tabbed interface** - Organized tabs for Metadata, Images, Trailers, and Cast & Crew
- Download and save metadata locally (NFO files, images, trailers)
- Support for multiple image types: posters, backgrounds, logos, banners, clearart
- **Image search and upload** - Search external providers or upload custom images
- **Trailer search and download** - Search YouTube and download trailers with quality selection
- **Trailer resolution badges** - Color-coded badges showing available resolutions (4K purple, 2K indigo, 1080p green, 720p blue)
- **Music video support** - Search and download music videos for tracks
- **Subtitle management** - Search, download, and manage subtitles for movies and TV shows
- **Square aspect ratio for music** - Artists, albums, and tracks display with square images

### Local Metadata Support
- Save metadata to local NFO files (Kodi/XBMC format)
- Download high-quality images (posters, backgrounds, logos, banners, clearart)
- **Automatic trailer naming** - Trailers saved with proper naming convention (MovieName-trailer.ext)
- **Music video downloads** - Download and save music videos for tracks
- Download trailers with quality selection (1080p, 720p, 480p, 360p)
- **Subtitle downloads** - Search and download subtitles from OpenSubtitles
- Support for local subtitles and extras
- **Local file detection** - Automatically detects existing local trailers, subtitles, and music videos
- Compatible with Plex, Kodi, Emby, and Jellyfin

### Playlist Management
- **Music playback** - Built-in audio player with play/pause, next/previous, queue management
- **Playlist browsing** - View all playlists with cover art from Plex
- **Track reordering** - Drag and drop to reorder tracks, or use up/down buttons
- **Add/remove tracks** - Search library and add tracks with multi-select, bulk remove
- **Cover art management** - Upload custom covers or choose from album art in playlist
- **Track matching** - Find better matches for tracks in your library
- **Missing track detection** - Identify and export tracks not available in library
- **Import playlists** - Import from CSV or text files with automatic track matching
- **Keyboard shortcuts** - Ctrl+A to select all, Delete to remove, Escape to clear
- Support for smart playlists
- **Audio player bar** - Persistent bottom bar with playback controls and progress

### Settings & Configuration
- Configurable API keys for TMDB, Fanart.tv, TVDB, and OpenSubtitles
- Customizable default view (grid/list) - **defaults to list view on first install**
- **Adjustable poster sizes with live preview** - Slider from 80px to 320px
- Adjustable image quality settings
- Theme support (light/dark mode)
- **Persistent column settings** - Remembers column visibility and order per library type
- **Persistent view mode** - Remembers grid/list preference
- Persistent settings across sessions

### Performance
- Efficient caching with Dexie (IndexedDB)
- Image lazy loading and transcoding
- **Virtual scrolling for grid view** - Renders only visible items for smooth performance
- **Hardware-accelerated scrolling** - CSS optimizations for smooth scrolling on large libraries
- **Background preloading** - Loads all items in background for instant alphabet navigation
- Optimized API requests with batching and deduplication
- **Removed expensive transitions** - Instant hover effects for better responsiveness
- **CSS containment** - Optimized rendering for individual items
- Progressive Web App (PWA) support for offline access

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TanStack Query** - Data fetching and caching
- **TanStack Virtual** - Virtual scrolling
- **Zustand** - State management
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework

### Backend/Desktop
- **Electron** - Desktop application framework
- **Node.js** - Runtime environment
- **Axios** - HTTP client
- **Fast XML Parser** - XML parsing for NFO files

### Data & Storage
- **Dexie** - IndexedDB wrapper for caching
- **Electron Store** - Persistent settings storage

### Media Processing
- **ytdl-core** - YouTube trailer downloads
- **music-metadata** - Audio file metadata reading
- **node-id3** - ID3 tag manipulation

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager
- Plex Media Server with accessible API

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/AuXBoX/AIO-Media-Manager.git
cd AIO-Media-Manager
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure API keys (optional):
Edit `.env` and add your API keys:
```
VITE_TMDB_API_KEY=your_tmdb_api_key
VITE_FANART_API_KEY=your_fanart_api_key
VITE_TVDB_API_KEY=your_tvdb_api_key
```

Note: The app includes fallback API keys for TMDB, so custom keys are optional.

### Running the Application

#### Web Version
```bash
npm run dev
```
Open http://localhost:5173 in your browser.

#### Desktop Version (Electron)
```bash
npm run dev:electron
```

### Building for Production

#### Web Build
```bash
npm run build
```
Output will be in the `dist/` directory.

#### Desktop Build
```bash
npm run build:electron
```
Installers will be created in the `dist-electron/` directory:
- Windows: `.exe` installer and `.zip` portable
- macOS: `.dmg` and `.zip`
- Linux: `.AppImage` and `.deb`

## Usage

### First Time Setup

1. Launch the application
2. Enter your Plex server URL and authentication token
3. Select a library to browse
4. Start managing your media metadata

### Getting a Plex Token

1. Sign in to Plex Web App
2. Open any media item
3. Click "Get Info" or "..." menu
4. Click "View XML"
5. Look for `X-Plex-Token` in the URL

Alternatively, visit: https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/

### Refreshing Metadata

1. Select a movie or TV show
2. Click "Refresh Metadata" button
3. Choose refresh options (metadata, images, trailers, cast)
4. Search and match content from external providers
5. Review and select desired metadata
6. Choose to save locally or update Plex only
7. Apply changes

### Managing Playlists

1. Navigate to Playlists section from the sidebar
2. Browse playlists with cover art preview
3. Click a playlist to view tracks
4. **Play music** - Click Play All or double-click any track
5. **Reorder tracks** - Drag the handle icon or use up/down arrows
6. **Add tracks** - Click "Add Tracks" and search your library
7. **Remove tracks** - Select tracks with checkboxes and click Remove, or use the X button
8. **Change cover** - Click the playlist cover to upload or select album art
9. **Match tracks** - Click "Match" to find better matches for tracks
10. **Check missing** - Click "Missing" to see tracks not in your library
11. **Import playlist** - Click the + button to import from CSV or text file

**Keyboard Shortcuts:**
- `Ctrl+A` - Select all tracks
- `Delete` - Remove selected tracks
- `Escape` - Clear selection

### Configuring API Keys

1. Go to Settings > API Keys
2. Enter your API keys for TMDB, Fanart.tv, or TVDB
3. Click "Save API Keys"
4. Keys are stored locally and never shared

## Configuration

### Settings Location

- **Electron (Windows)**: `%APPDATA%\aio-media-manager\settings\app-settings.json`
- **Electron (macOS)**: `~/Library/Application Support/aio-media-manager/settings/app-settings.json`
- **Electron (Linux)**: `~/.config/aio-media-manager/settings/app-settings.json`
- **Web**: Browser localStorage

### Available Settings

- Default view mode (grid/list)
- Poster size and image quality
- Column visibility and order
- Theme (light/dark)
- API keys
- Cache settings
- Local metadata preferences

## Local Metadata

### Supported Formats

**Images:**
- `.jpg`, `.jpeg`, `.png`, `.tbn`

**Metadata:**
- `.nfo` (Kodi/XBMC format)

**Subtitles:**
- `.srt`, `.smi`, `.ssa`, `.ass`

**Trailers:**
- All video formats supported by Plex

### File Naming Conventions

**Movies:**
```
/Movies
   /Movie Name (Year)
      Movie Name (Year).mkv
      Movie Name (Year).nfo
      poster.jpg
      fanart.jpg
      clearlogo.png
      Movie Name-trailer.mp4
      Movie Name-trailer2.mp4
```

Note: Trailers are placed directly in the movie folder and named `MovieName-trailer.ext` for the first trailer, and `MovieName-trailer2.ext`, `MovieName-trailer3.ext` for additional trailers.

**TV Shows:**
```
/TV Shows
   /Show Name (Year)
      tvshow.nfo
      show.jpg
      fanart.jpg
      Show Name-trailer.mp4
      /Season 01
         Show Name - s01e01 - Episode.mkv
         Show Name - s01e01 - Episode.nfo
         Show Name - s01e01 - Episode.jpg
```

Note: Trailers are placed directly in the show folder and named `ShowName-trailer.ext` for the first trailer, and `ShowName-trailer2.ext`, `ShowName-trailer3.ext` for additional trailers.

**Music:**
```
/Music
   /Artist Name
      artist-poster.jpg
      artist-background.jpg
      /Album Name
         cover.jpg
         01 - Track Name.mp3
```

For complete documentation, see the Plex support articles:
- [Local Media Assets - Movies](https://support.plex.tv/articles/200220677-local-media-assets-movies/)
- [Local Files for Trailers and Extras](https://support.plex.tv/articles/local-files-for-trailers-and-extras/)

## Development

### Project Structure

```
aio-media-manager/
├── electron/              # Electron main process
│   ├── main.js           # Main entry point
│   └── preload.js        # Preload script
├── src/
│   ├── api/              # API clients and utilities
│   ├── components/       # React components
│   │   ├── audio/        # Audio player components
│   │   ├── library/      # Library browsing components
│   │   ├── playlists/    # Playlist management components
│   │   ├── settings/     # Settings components
│   │   └── ui/           # Reusable UI components
│   ├── managers/         # Business logic managers
│   ├── pages/            # Page components
│   ├── providers/        # External metadata providers
│   ├── store/            # State management
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── public/               # Static assets
└── dist/                 # Build output
```

### Key Managers

- **LibraryManager** - Library browsing and item retrieval
- **MetadataManager** - Metadata operations
- **LocalMetadataManager** - Local file operations
- **PlaylistManager** - Playlist management
- **CacheManager** - Caching layer
- **SettingsManager** - Settings persistence
- **AuthenticationManager** - Plex authentication

## API Keys

### TMDB (The Movie Database)

The app includes a fallback TMDB API key for immediate use. For better rate limits, get your own free key:

1. Create account at https://www.themoviedb.org/
2. Go to Settings > API
3. Request an API key
4. Add to Settings > API Keys in the app

### Fanart.tv

For high-quality artwork (posters, backgrounds, logos, banners):

1. Create account at https://fanart.tv/
2. Get API key at https://fanart.tv/get-an-api-key/
3. Add to Settings > API Keys in the app

### TVDB (TheTVDB)

For TV show metadata:

1. Create account at https://thetvdb.com/
2. Get API key at https://thetvdb.com/api-information
3. Add to Settings > API Keys in the app

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting (Prettier)
- Write tests for new features
- Update documentation as needed
- Keep commits focused and descriptive

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Plex Media Server](https://www.plex.tv/) - Media server platform
- [TMDB](https://www.themoviedb.org/) - Movie and TV metadata
- [Fanart.tv](https://fanart.tv/) - High-quality artwork
- [TVDB](https://thetvdb.com/) - TV show metadata
- All open-source libraries and contributors

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing issues for solutions
- Review documentation and troubleshooting guide

**Note:** This application is not affiliated with or endorsed by Plex Inc. It is an independent tool that uses the Plex Media Server API.
