import type { ColumnDefinition } from './ColumnSelector';

/**
 * Column definitions for Movies
 */
export const movieColumns: ColumnDefinition[] = [
  { id: 'title', label: 'Title', visible: true, sortable: true },
  { id: 'sortTitle', label: 'Sort title', visible: false, sortable: true },
  { id: 'year', label: 'Year', visible: true, sortable: true, width: 80 },
  { id: 'originallyAvailableAt', label: 'Release date', visible: false, sortable: true, width: 120 },
  { id: 'studio', label: 'Studio', visible: false, sortable: true, width: 150 },
  { id: 'contentRating', label: 'Certification', visible: false, sortable: true, width: 100 },
  { id: 'rating', label: 'Rating', visible: true, sortable: true, width: 80 },
  { id: 'audienceRating', label: 'User Rating', visible: false, sortable: true, width: 100 },
  { id: 'duration', label: 'Runtime [min]', visible: true, sortable: true, width: 120 },
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 120 },
  { id: 'viewCount', label: 'Watched', visible: false, sortable: true, width: 80 },
  { id: 'lastViewedAt', label: 'Last watched', visible: false, sortable: true, width: 120 },
  { id: 'videoResolution', label: 'Resolution', visible: false, sortable: false, width: 100 },
  { id: 'videoCodec', label: 'Video codec', visible: false, sortable: false, width: 120 },
  { id: 'audioCodec', label: 'Audio codec', visible: false, sortable: false, width: 120 },
  { id: 'audioChannels', label: 'Audio channels', visible: false, sortable: false, width: 120 },
  { id: 'bitrate', label: 'Video bitrate', visible: false, sortable: false, width: 120 },
  { id: 'aspectRatio', label: 'Aspect ratio', visible: false, sortable: false, width: 100 },
  { id: 'container', label: 'Format', visible: false, sortable: false, width: 80 },
  { id: 'size', label: 'File size', visible: false, sortable: true, width: 100 },
];

/**
 * Column definitions for TV Shows
 */
export const tvShowColumns: ColumnDefinition[] = [
  { id: 'title', label: 'Title', visible: true, sortable: true },
  { id: 'sortTitle', label: 'Sort title', visible: false, sortable: true },
  { id: 'year', label: 'Year', visible: true, sortable: true, width: 80 },
  { id: 'originallyAvailableAt', label: 'First aired', visible: false, sortable: true, width: 120 },
  { id: 'studio', label: 'Network', visible: false, sortable: true, width: 150 },
  { id: 'contentRating', label: 'Certification', visible: false, sortable: true, width: 100 },
  { id: 'rating', label: 'Rating', visible: true, sortable: true, width: 80 },
  { id: 'leafCount', label: 'Episodes', visible: true, sortable: true, width: 100 },
  { id: 'viewedLeafCount', label: 'Watched', visible: false, sortable: true, width: 100 },
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 120 },
  { id: 'lastViewedAt', label: 'Last watched', visible: false, sortable: true, width: 120 },
];

/**
 * Column definitions for Music (Artists)
 */
export const artistColumns: ColumnDefinition[] = [
  { id: 'title', label: 'Artist', visible: true, sortable: true },
  { id: 'sortTitle', label: 'Sort name', visible: false, sortable: true },
  { id: 'genre', label: 'Genre', visible: true, sortable: true, width: 150 },
  { id: 'country', label: 'Country', visible: false, sortable: true, width: 120 },
  { id: 'childCount', label: 'Albums', visible: true, sortable: true, width: 80 },
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 120 },
  { id: 'lastViewedAt', label: 'Last played', visible: false, sortable: true, width: 120 },
  { id: 'viewCount', label: 'Play count', visible: false, sortable: true, width: 100 },
];

/**
 * Column definitions for Music (Albums)
 */
export const albumColumns: ColumnDefinition[] = [
  { id: 'title', label: 'Album', visible: true, sortable: true },
  { id: 'parentTitle', label: 'Artist', visible: true, sortable: true },
  { id: 'year', label: 'Year', visible: true, sortable: true, width: 80 },
  { id: 'originallyAvailableAt', label: 'Release date', visible: false, sortable: true, width: 120 },
  { id: 'studio', label: 'Label', visible: false, sortable: true, width: 150 },
  { id: 'genre', label: 'Genre', visible: true, sortable: true, width: 150 },
  { id: 'rating', label: 'Rating', visible: false, sortable: true, width: 80 },
  { id: 'leafCount', label: 'Tracks', visible: true, sortable: true, width: 80 },
  { id: 'duration', label: 'Duration', visible: false, sortable: true, width: 100 },
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 120 },
  { id: 'lastViewedAt', label: 'Last played', visible: false, sortable: true, width: 120 },
  { id: 'viewCount', label: 'Play count', visible: false, sortable: true, width: 100 },
];

/**
 * Column definitions for Music (Tracks)
 */
export const trackColumns: ColumnDefinition[] = [
  { id: 'title', label: 'Track', visible: true, sortable: true },
  { id: 'grandparentTitle', label: 'Artist', visible: true, sortable: true },
  { id: 'parentTitle', label: 'Album', visible: true, sortable: true },
  { id: 'index', label: 'Track #', visible: true, sortable: true, width: 80 },
  { id: 'parentIndex', label: 'Disc #', visible: false, sortable: true, width: 80 },
  { id: 'year', label: 'Year', visible: false, sortable: true, width: 80 },
  { id: 'genre', label: 'Genre', visible: false, sortable: true, width: 150 },
  { id: 'rating', label: 'Rating', visible: false, sortable: true, width: 80 },
  { id: 'duration', label: 'Duration', visible: true, sortable: true, width: 100 },
  { id: 'bitrate', label: 'Bitrate', visible: false, sortable: false, width: 100 },
  { id: 'audioCodec', label: 'Codec', visible: false, sortable: false, width: 100 },
  { id: 'container', label: 'Format', visible: false, sortable: false, width: 80 },
  { id: 'size', label: 'File size', visible: false, sortable: false, width: 100 },
  { id: 'addedAt', label: 'Date added', visible: false, sortable: true, width: 120 },
  { id: 'lastViewedAt', label: 'Last played', visible: false, sortable: true, width: 120 },
  { id: 'viewCount', label: 'Play count', visible: false, sortable: true, width: 100 },
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
    if (contentType === 'album' || contentType === '9') {
      return albumColumns;
    } else if (contentType === 'track' || contentType === '10') {
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

    case 'addedAt':
    case 'lastViewedAt':
      // Format timestamp to date
      const timestamp = item[columnId];
      if (!timestamp) return '-';
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString();

    case 'originallyAvailableAt':
      // Already a date string
      return item.originallyAvailableAt || '-';

    case 'size':
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

    case 'container':
      const container = item.Media?.[0]?.container;
      return container ? container.toUpperCase() : '-';

    case 'aspectRatio':
      return item.Media?.[0]?.aspectRatio || '-';

    case 'leafCount':
      // For albums/shows - number of tracks/episodes
      return item.leafCount ? String(item.leafCount) : '-';

    case 'childCount':
      // For artists - number of albums
      return item.childCount ? String(item.childCount) : '-';

    case 'viewedLeafCount':
      // For shows - watched episodes
      return item.viewedLeafCount ? String(item.viewedLeafCount) : '-';

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

    default:
      // Fallback for any other columns
      const defaultValue = item[columnId];
      return defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : '-';
  }
}
