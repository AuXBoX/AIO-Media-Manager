import type { ColumnDefinition } from './ColumnSelector';

/**
 * Column definitions for Movies
 */
export const movieColumns: ColumnDefinition[] = [
  // Title group
  { id: 'title', label: 'Title', visible: true, sortable: true },
  { id: 'originalTitle', label: 'Original title', visible: false, sortable: true },
  { id: 'sortTitle', label: 'Sort title', visible: false, sortable: true },
  { id: 'year', label: 'Year', visible: true, sortable: true, width: 80 },
  { id: 'originallyAvailableAt', label: 'Release date', visible: false, sortable: true, width: 140 },
  { id: 'path', label: 'Path', visible: false, sortable: false },
  { id: 'filename', label: 'Filename', visible: false, sortable: false },
  // Rating group
  { id: 'rating', label: 'Rating', visible: true, sortable: true, width: 100 },
  { id: 'audienceRating', label: 'User Rating', visible: false, sortable: true, width: 120 },
  { id: 'top250', label: 'Top 250', visible: false, sortable: true, width: 100 },
  { id: 'votes', label: 'Votes', visible: false, sortable: true, width: 100 },
  { id: 'contentRating', label: 'Certification', visible: false, sortable: true, width: 120 },
  // Date group
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 140 },
  // Runtime group
  { id: 'duration', label: 'Runtime [min]', visible: true, sortable: true, width: 140 },
  { id: 'durationHHMM', label: 'Runtime [hh:mm]', visible: false, sortable: true, width: 150 },
  // Format group
  { id: 'aspectRatio', label: 'Aspect ratio', visible: false, sortable: false, width: 120 },
  // Video codec group
  { id: 'videoCodec', label: 'Video codec', visible: false, sortable: false, width: 140 },
  { id: 'bitrate', label: 'Video bitrate', visible: false, sortable: false, width: 140 },
  { id: 'audioCodec', label: 'Audio codec', visible: false, sortable: false, width: 140 },
  { id: 'audioChannels', label: 'Audio channels', visible: false, sortable: false, width: 140 },
  { id: 'videoFileSize', label: 'Video file size', visible: false, sortable: true, width: 140 },
  // Other
  { id: 'container', label: 'Format', visible: false, sortable: false, width: 100 },
  { id: 'size', label: 'Total file size', visible: false, sortable: true, width: 140 },
  { id: 'videoResolution', label: 'Resolution', visible: false, sortable: false, width: 120 },
  // Metadata
  { id: 'hasImages', label: 'Images', visible: false, sortable: false, width: 100 },
  { id: 'viewCount', label: 'Watched', visible: false, sortable: true, width: 100 },
  { id: 'lastViewedAt', label: 'Last watched', visible: false, sortable: true, width: 140 },
];

/**
 * Column definitions for TV Shows (video content - similar to movies but with TV-specific fields)
 */
export const tvShowColumns: ColumnDefinition[] = [
  // Title group
  { id: 'title', label: 'Title', visible: true, sortable: true },
  { id: 'originalTitle', label: 'Original title', visible: false, sortable: true },
  { id: 'sortTitle', label: 'Sort title', visible: false, sortable: true },
  { id: 'year', label: 'Year', visible: true, sortable: true, width: 80 },
  // Season/Episode group
  { id: 'seasonCount', label: 'Season count', visible: true, sortable: true, width: 140 },
  { id: 'leafCount', label: 'Episode count', visible: true, sortable: true, width: 140 },
  // Rating group
  { id: 'rating', label: 'Rating', visible: true, sortable: true, width: 100 },
  { id: 'audienceRating', label: 'User-Rating', visible: false, sortable: true, width: 120 },
  { id: 'originallyAvailableAt', label: 'Aired', visible: false, sortable: true, width: 120 },
  { id: 'contentRating', label: 'Certification', visible: false, sortable: true, width: 120 },
  // Date group
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 140 },
  // Runtime group
  { id: 'duration', label: 'Runtime [min]', visible: false, sortable: true, width: 140 },
  { id: 'durationHHMM', label: 'Runtime [hh:mm]', visible: false, sortable: true, width: 150 },
  // Other
  { id: 'viewCount', label: 'Watched', visible: false, sortable: true, width: 100 },
  { id: 'musicTheme', label: 'Music Theme', visible: false, sortable: false, width: 140 },
];

/**
 * Column definitions for Music (Artists)
 */
export const artistColumns: ColumnDefinition[] = [
  // Name group
  { id: 'title', label: 'Artist', visible: true, sortable: true },
  { id: 'sortTitle', label: 'Sort name', visible: false, sortable: true },
  { id: 'originalTitle', label: 'Original name', visible: false, sortable: true },
  // Music metadata
  { id: 'genre', label: 'Genre', visible: true, sortable: true, width: 150 },
  { id: 'country', label: 'Country', visible: false, sortable: true, width: 120 },
  { id: 'mood', label: 'Mood', visible: false, sortable: false, width: 120 },
  { id: 'style', label: 'Style', visible: false, sortable: false, width: 120 },
  { id: 'similar', label: 'Similar artists', visible: false, sortable: false, width: 150 },
  // Counts
  { id: 'childCount', label: 'Albums', visible: true, sortable: true, width: 80 },
  { id: 'leafCount', label: 'Tracks', visible: false, sortable: true, width: 80 },
  // Rating
  { id: 'rating', label: 'Rating', visible: false, sortable: true, width: 80 },
  { id: 'audienceRating', label: 'User Rating', visible: false, sortable: true, width: 100 },
  // Path
  { id: 'path', label: 'Path', visible: false, sortable: false },
  // Dates & plays
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 120 },
  { id: 'lastViewedAt', label: 'Last played', visible: false, sortable: true, width: 120 },
  { id: 'viewCount', label: 'Play count', visible: false, sortable: true, width: 100 },
  // Metadata
  { id: 'hasImages', label: 'Images', visible: false, sortable: false, width: 80 },
  { id: 'note', label: 'Note', visible: false, sortable: false },
];

/**
 * Column definitions for Music (Albums)
 */
export const albumColumns: ColumnDefinition[] = [
  // Title group
  { id: 'title', label: 'Album', visible: true, sortable: true },
  { id: 'parentTitle', label: 'Artist', visible: true, sortable: true },
  { id: 'sortTitle', label: 'Sort title', visible: false, sortable: true },
  { id: 'year', label: 'Year', visible: true, sortable: true, width: 80 },
  { id: 'originallyAvailableAt', label: 'Release date', visible: false, sortable: true, width: 120 },
  // Music metadata
  { id: 'studio', label: 'Label', visible: false, sortable: true, width: 150 },
  { id: 'genre', label: 'Genre', visible: true, sortable: true, width: 150 },
  { id: 'mood', label: 'Mood', visible: false, sortable: false, width: 120 },
  { id: 'style', label: 'Style', visible: false, sortable: false, width: 120 },
  { id: 'albumType', label: 'Album type', visible: false, sortable: true, width: 100 },
  // Counts
  { id: 'leafCount', label: 'Tracks', visible: true, sortable: true, width: 80 },
  { id: 'discCount', label: 'Discs', visible: false, sortable: true, width: 80 },
  { id: 'duration', label: 'Duration', visible: false, sortable: true, width: 100 },
  // Rating
  { id: 'rating', label: 'Rating', visible: false, sortable: true, width: 80 },
  { id: 'audienceRating', label: 'User Rating', visible: false, sortable: true, width: 100 },
  // Path
  { id: 'path', label: 'Path', visible: false, sortable: false },
  // Dates & plays
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 120 },
  { id: 'lastViewedAt', label: 'Last played', visible: false, sortable: true, width: 120 },
  { id: 'viewCount', label: 'Play count', visible: false, sortable: true, width: 100 },
  // Metadata
  { id: 'hasImages', label: 'Images', visible: false, sortable: false, width: 80 },
  { id: 'note', label: 'Note', visible: false, sortable: false },
];

/**
 * Column definitions for Music (Tracks)
 */
export const trackColumns: ColumnDefinition[] = [
  // Title group
  { id: 'title', label: 'Track', visible: true, sortable: true },
  { id: 'grandparentTitle', label: 'Artist', visible: true, sortable: true },
  { id: 'parentTitle', label: 'Album', visible: true, sortable: true },
  { id: 'sortTitle', label: 'Sort title', visible: false, sortable: true },
  // Track info
  { id: 'index', label: 'Track #', visible: true, sortable: true, width: 80 },
  { id: 'parentIndex', label: 'Disc #', visible: false, sortable: true, width: 80 },
  { id: 'year', label: 'Year', visible: false, sortable: true, width: 80 },
  { id: 'originalTitle', label: 'Original title', visible: false, sortable: true },
  // Music metadata
  { id: 'genre', label: 'Genre', visible: false, sortable: true, width: 150 },
  { id: 'mood', label: 'Mood', visible: false, sortable: false, width: 120 },
  { id: 'composer', label: 'Composer', visible: false, sortable: true, width: 150 },
  // Rating
  { id: 'rating', label: 'Rating', visible: false, sortable: true, width: 80 },
  { id: 'audienceRating', label: 'User Rating', visible: false, sortable: true, width: 100 },
  // Audio info
  { id: 'duration', label: 'Duration', visible: true, sortable: true, width: 100 },
  { id: 'bitrate', label: 'Bitrate', visible: false, sortable: false, width: 100 },
  { id: 'audioCodec', label: 'Codec', visible: false, sortable: false, width: 100 },
  { id: 'audioChannels', label: 'Channels', visible: false, sortable: false, width: 80 },
  { id: 'samplingRate', label: 'Sample rate', visible: false, sortable: false, width: 100 },
  { id: 'container', label: 'Format', visible: false, sortable: false, width: 80 },
  { id: 'size', label: 'File size', visible: false, sortable: false, width: 100 },
  // Path
  { id: 'path', label: 'Path', visible: false, sortable: false },
  // Dates & plays
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 120 },
  { id: 'lastViewedAt', label: 'Last played', visible: false, sortable: true, width: 120 },
  { id: 'viewCount', label: 'Play count', visible: false, sortable: true, width: 100 },
  // Metadata
  { id: 'hasLyrics', label: 'Lyrics', visible: false, sortable: false, width: 80 },
  { id: 'note', label: 'Note', visible: false, sortable: false },
];

/**
 * Get column definitions based on library type and content type
 */
export function getColumnDefinitions(libraryType: string, contentType?: string): ColumnDefinition[] {
  if (libraryType === 'movie') {
    return movieColumns;
  } else if (libraryType === 'show') {
    return tvShowColumns;
  } else if (libraryType === 'artist') {
    // Music library - determine if showing artists, albums, or tracks
    if (contentType === 'album' || contentType === 'albums' || contentType === '9') {
      return albumColumns;
    } else if (contentType === 'track' || contentType === 'tracks' || contentType === '10') {
      return trackColumns;
    } else {
      return artistColumns;
    }
  }
  
  // Default fallback
  return [
    { id: 'title', label: 'Title', visible: true, sortable: true },
    { id: 'year', label: 'Year', visible: true, sortable: true, width: 80 },
    { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 120 },
  ];
}

/**
 * Format cell value based on column type
 */
export function formatCellValue(columnId: string, _value: any, item: any): string {
  // For nested properties, extract directly from item
  switch (columnId) {
    case 'title':
      return item.title || '-';

    case 'originalTitle':
      return item.originalTitle || '-';

    case 'sortTitle':
      return item.titleSort || item.sortTitle || '-';

    case 'duration':
      // Convert milliseconds to minutes or HH:MM:SS
      const durationValue = item.duration;
      if (!durationValue) return '-';
      const seconds = Math.floor(durationValue / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
      } else {
        return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
      }

    case 'durationHHMM':
      // Convert milliseconds to HH:MM format
      const durValue = item.duration;
      if (!durValue) return '-';
      const totalMinutes = Math.floor(durValue / 60000);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${h}h ${m}m`;

    case 'addedAt':
    case 'lastViewedAt':
    case 'episodeAddedAt':
    case 'fileCreationDate':
      // Format timestamp to date
      const timestamp = item[columnId];
      if (!timestamp) return '-';
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString();

    case 'originallyAvailableAt':
      // Already a date string
      return item.originallyAvailableAt || '-';

    case 'size':
    case 'videoFileSize':
      // Get size from Media array
      const mediaSize = item.Media?.[0]?.Part?.[0]?.size;
      if (!mediaSize) return '-';
      const bytes = parseInt(mediaSize);
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;

    case 'bitrate':
      // Get bitrate from Media array
      const mediaBitrate = item.Media?.[0]?.bitrate;
      if (!mediaBitrate) return '-';
      // Plex stores bitrate in kbps
      return mediaBitrate >= 1000 
        ? `${(mediaBitrate / 1000).toFixed(1)} Mbps`
        : `${mediaBitrate} kbps`;

    case 'rating':
      // Format rating to 1 decimal place
      const ratingValue = item.rating;
      return ratingValue ? ratingValue.toFixed(1) : '-';

    case 'audienceRating':
      const audienceRatingValue = item.audienceRating;
      return audienceRatingValue ? audienceRatingValue.toFixed(1) : '-';

    case 'imdbRating':
      return item.imdbRating || '-';

    case 'rottenTomatoesRating':
      return item.rottenTomatoesRating || '-';

    case 'metascore':
      return item.metascore || '-';

    case 'tmdbRating':
      return item.tmdbRating || '-';

    case 'top250':
      return item.top250 ? `#${item.top250}` : '-';

    case 'votes':
      return item.votes ? String(item.votes) : '-';

    case 'viewCount':
      const viewCountValue = item.viewCount;
      return viewCountValue && viewCountValue > 0 ? String(viewCountValue) : '-';

    case 'genre':
      // Handle array of genres
      if (Array.isArray(item.Genre)) {
        return item.Genre.map((g: any) => g.tag || g).slice(0, 2).join(', ');
      }
      return item.genre || '-';

    case 'studio':
      return item.studio || '-';

    case 'contentRating':
      return item.contentRating || '-';

    case 'videoResolution':
      // Get resolution from Media array
      const resolution = item.Media?.[0]?.videoResolution;
      return resolution ? `${resolution}p` : '-';

    case 'videoCodec':
      const videoCodec = item.Media?.[0]?.videoCodec;
      return videoCodec ? videoCodec.toUpperCase() : '-';

    case 'audioCodec':
      const audioCodec = item.Media?.[0]?.audioCodec;
      return audioCodec ? audioCodec.toUpperCase() : '-';

    case 'audioChannels':
      const channels = item.Media?.[0]?.audioChannels;
      if (!channels) return '-';
      if (channels === 6) return '5.1';
      if (channels === 8) return '7.1';
      if (channels === 2) return 'Stereo';
      return String(channels);

    case 'audioStreamCount':
      const audioStreams = item.Media?.[0]?.Part?.[0]?.Stream?.filter((s: any) => s.streamType === 2);
      return audioStreams ? String(audioStreams.length) : '-';

    case 'container':
      const container = item.Media?.[0]?.container;
      return container ? container.toUpperCase() : '-';

    case 'aspectRatio':
      return item.Media?.[0]?.aspectRatio || '-';

    case 'secondAspectRatio':
      return '-';

    case 'hdr':
      const videoStream = item.Media?.[0]?.Part?.[0]?.Stream?.find((s: any) => s.streamType === 1);
      return videoStream?.DOVIProfile ? 'Yes' : '-';

    case 'hdrFormat':
      const hdrStream = item.Media?.[0]?.Part?.[0]?.Stream?.find((s: any) => s.streamType === 1);
      return hdrStream?.DOVIProfile ? 'Dolby Vision' : '-';

    case 'edition':
      return item.edition || '-';

    case 'source':
      return item.source || '-';

    case 'threeD':
      return item.Media?.[0]?.video3DFormat ? 'Yes' : '-';

    case 'path':
      return item.Media?.[0]?.Part?.[0]?.file || '-';

    case 'filename':
      const filePath = item.Media?.[0]?.Part?.[0]?.file;
      return filePath ? filePath.split(/[\\/]/).pop() : '-';

    case 'collection':
      if (Array.isArray(item.Collection)) {
        return item.Collection.map((c: any) => c.tag || c).join(', ');
      }
      return '-';

    case 'hasImages':
      return item.thumb ? 'Yes' : '-';

    case 'trailer':
      return item.trailer ? 'Yes' : '-';

    case 'subtitles':
      const subtitleStreams = item.Media?.[0]?.Part?.[0]?.Stream?.filter((s: any) => s.streamType === 3);
      return subtitleStreams && subtitleStreams.length > 0 ? 'Yes' : '-';

    case 'musicTheme':
      return item.theme ? 'Yes' : '-';

    case 'note':
      return item.note || '-';

    case 'newEpisodes':
      return '-';

    case 'leafCount':
      // For albums/shows - number of tracks/episodes
      return item.leafCount !== undefined && item.leafCount !== null ? String(item.leafCount) : '-';

    case 'childCount':
      // For artists - number of albums
      return item.childCount !== undefined && item.childCount !== null ? String(item.childCount) : '-';

    case 'viewedLeafCount':
      // For shows - watched episodes
      return item.viewedLeafCount ? String(item.viewedLeafCount) : '-';

    case 'missingEpisodeCount':
      // Calculate missing episodes
      const total = item.leafCount || 0;
      const watched = item.viewedLeafCount || 0;
      return total > 0 ? String(total - watched) : '-';

    case 'seasonCount':
      return item.childCount !== undefined && item.childCount !== null ? String(item.childCount) : '-';

    case 'status':
      return item.status || '-';

    case 'index':
      // Track number or episode number
      return item.index ? String(item.index) : '-';

    case 'parentIndex':
      // Disc number or season number
      return item.parentIndex ? String(item.parentIndex) : '-';

    case 'parentTitle':
      // Album name or show name
      return item.parentTitle || '-';

    case 'grandparentTitle':
      // Artist name for tracks
      return item.grandparentTitle || '-';

    case 'year':
      return item.year ? String(item.year) : '-';

    // Music-specific fields
    case 'mood':
      if (Array.isArray(item.Mood)) {
        return item.Mood.map((m: any) => m.tag || m).slice(0, 2).join(', ');
      }
      return item.mood || '-';

    case 'style':
      if (Array.isArray(item.Style)) {
        return item.Style.map((s: any) => s.tag || s).slice(0, 2).join(', ');
      }
      return item.style || '-';

    case 'similar':
      if (Array.isArray(item.Similar)) {
        return item.Similar.map((s: any) => s.tag || s).slice(0, 3).join(', ');
      }
      return item.similar || '-';

    case 'composer':
      return item.Media?.[0]?.Part?.[0]?.Stream?.[0]?.title || item.composer || '-';

    case 'albumType':
      return item.albumType || '-';

    case 'discCount':
      return item.discCount ? String(item.discCount) : '-';

    case 'samplingRate':
      const sampleRate = item.Media?.[0]?.Part?.[0]?.Stream?.[0]?.samplingRate;
      if (!sampleRate) return '-';
      return sampleRate >= 1000 ? `${(sampleRate / 1000).toFixed(1)} kHz` : `${sampleRate} Hz`;

    case 'hasLyrics':
      const hasLyrics = item.Media?.[0]?.Part?.[0]?.Stream?.[0]?.lyrics;
      return hasLyrics ? 'Yes' : '-';

    default:
      // Fallback for any other columns
      const defaultValue = item[columnId];
      return defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : '-';
  }
}
