# AIO Media Manager v1.0.0

## Overview

AIO Media Manager is a desktop application for viewing, editing, and managing metadata for movies, TV shows, and music in your Plex Media Server libraries. Built with Electron and React, it provides a modern, responsive interface with powerful features for organizing your media collection.

## Features

### Library Management
- **Multi-Library Support** — Browse and manage movies, TV shows, and music libraries
- **Multiple View Modes** — Grid view, list view, and table view with customizable columns
- **Virtual Scrolling** — Smooth performance with large libraries using virtualized lists
- **Infinite Scroll** — Load items progressively as you scroll
- **Alphabet Navigation** — Jump to any letter with the alphabet sidebar
- **Advanced Filtering** — Filter by genre, year, rating, and more
- **Search** — Full-text search across your library

### Metadata Editing
- **Metadata Refresh** — Fetch updated metadata from external providers
- **Image Management** — Search and select posters, backgrounds, and logos from multiple sources
- **Trailer Management** — Search for and download trailers from YouTube
- **Subtitle Support** — Search and download subtitles from OpenSubtitles and SubDL
- **Local Metadata** — Save metadata as NFO files alongside your media
- **Batch Operations** — Edit multiple items at once

### Playlist Features
- **Playlist Creation** — Create and manage playlists
- **Track Matching** — Match tracks from external sources to your Plex library
- **Import Playlists** — Import from CSV, text files, or online sources:
  - YouTube Music playlists
  - Deezer playlists
  - Billboard charts
  - ARIA charts
  - Last.fm charts
- **Region-Aware Suggestions** — Get popular playlist recommendations based on your location
- **Audio Playback** — Built-in audio player with queue support

### External Metadata Providers
- **TMDB** — Movie and TV show metadata
- **TVDB** — TV show metadata
- **IMDB** — Movie ratings and metadata
- **MusicBrainz** — Music metadata
- **Discogs** — Music release information
- **Last.fm** — Music scrobbling and metadata
- **Fanart.tv** — High-quality artwork
- **Album Art Exchange** — Album artwork
- **YouTube** — Trailer search and download

### User Interface
- **Dark Mode** — Full dark theme support
- **Responsive Design** — Works on desktop and tablet screens
- **Customizable Columns** — Choose which columns to display in table view
- **Detail Panel** — View and edit item details in a side panel
- **Keyboard Navigation** — Navigate the app with keyboard shortcuts
- **Touch Gestures** — Swipe support for touch-enabled devices

### Settings & Configuration
- **API Key Management** — Configure API keys for external services
- **Cache Settings** — Manage local cache for faster loading
- **Performance Options** — Tune performance for your library size
- **Privacy Controls** — Control data sharing and analytics
- **Binary Management** — Auto-download and update yt-dlp and ffmpeg

### Technical Features
- **Plex WebSocket** — Real-time updates when your library changes
- **Offline Support** — PWA support for offline access
- **Request Batching** — Efficient API calls with automatic batching
- **Request Deduplication** — Prevents duplicate API requests
- **Progressive Image Loading** — Smooth image loading with placeholders
- **Cross-Platform** — Windows, macOS, and Linux support

## Installation

### Windows
Download the installer: `AIO Media Manager Setup 1.0.0.exe`

### macOS
Download the disk image: `AIO Media Manager-1.0.0.dmg`

### Linux
Download the AppImage: `AIO Media Manager-1.0.0.AppImage`

## System Requirements

- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Memory**: 4 GB RAM minimum
- **Storage**: 200 MB for application + cache space
- **Network**: Connection to Plex Media Server required
- **Plex**: Plex Media Server 1.20.0 or later

## Getting Started

1. Install AIO Media Manager
2. Launch the application
3. Sign in with your Plex account
4. Select your Plex server
5. Browse and manage your libraries!

## Configuration

### API Keys (Optional)

For enhanced metadata fetching, you can add API keys for:
- TMDB (The Movie Database)
- TVDB (The TV Database)
- Fanart.tv
- OpenSubtitles

Configure these in **Settings → API Keys**.

### Binaries

The app can auto-download required binaries:
- **yt-dlp** — For YouTube trailer downloads
- **ffmpeg** — For subtitle extraction and media processing

These are managed automatically in **Settings → Binaries**.

## Known Limitations

- Some metadata providers require API keys for full functionality
- YouTube Music playlist import requires the desktop application (not available in web mode)
- Large libraries (50,000+ items) may require performance tuning

## Feedback & Support

Found a bug or have a feature request? Please open an issue on GitHub.

---

**Full Changelog**: https://github.com/AuxBox/AIO-Media-Manager/commits/v1.0.0
