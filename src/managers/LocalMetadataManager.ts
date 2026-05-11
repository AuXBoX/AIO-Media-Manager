import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { MetadataItem, MetadataManager, MetadataUpdate } from './MetadataManager';

/**
 * NFO metadata interface (Kodi/Emby format)
 */
export interface NfoMetadata {
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

/**
 * Embedded metadata interface (ID3/MP4 tags)
 */
export interface EmbeddedMetadata {
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

/**
 * Metadata save mode configuration
 */
export interface MetadataSaveMode {
  target: 'plex' | 'local' | 'both';
  localFormat?: 'nfo' | 'embedded' | 'both';
  createBackup?: boolean;
  overwriteExisting?: boolean;
}

/**
 * Local metadata sync result interface
 */
export interface LocalSyncResult {
  success: boolean;
  plexUpdated: boolean;
  nfoUpdated: boolean;
  embeddedUpdated: boolean;
  errors: string[];
}

/**
 * Local change detection result
 */
export interface LocalChangeDetection {
  hasLocalChanges: boolean;
  nfoExists: boolean;
  nfoModifiedAt?: number;
  embeddedModifiedAt?: number;
  plexModifiedAt: number;
  conflicts: Array<{ field: string; plexValue: any; localValue: any }>;
}

/**
 * Bulk export result
 */
export interface BulkExportResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ ratingKey: string; error: string }>;
}

/**
 * Access validation result
 */
export interface AccessValidation {
  canRead: boolean;
  canWrite: boolean;
  path: string;
  error?: string;
}

/**
 * Local Metadata Manager Interface
 */
export interface ILocalMetadataManager {
  // NFO file operations
  readNfoFile(filePath: string): Promise<NfoMetadata | null>;
  writeNfoFile(filePath: string, metadata: NfoMetadata): Promise<void>;
  deleteNfoFile(filePath: string): Promise<void>;
  backupNfoFile(filePath: string): Promise<string>;

  // Embedded metadata operations
  readEmbeddedMetadata(filePath: string): Promise<EmbeddedMetadata | null>;
  writeEmbeddedMetadata(filePath: string, metadata: EmbeddedMetadata): Promise<void>;

  // Sync operations
  syncToLocal(item: MetadataItem, mode: MetadataSaveMode): Promise<LocalSyncResult>;
  syncFromLocal(filePath: string): Promise<MetadataItem>;
  detectLocalChanges(item: MetadataItem): Promise<LocalChangeDetection>;

  // Bulk operations
  bulkExportToLocal(
    ratingKeys: string[],
    format: 'nfo' | 'embedded' | 'both'
  ): Promise<BulkExportResult>;

  // File system access
  validateAccess(directoryPath: string): Promise<AccessValidation>;
  getMediaFilePath(ratingKey: string): Promise<string | null>;
}

/**
 * Local Metadata Manager Implementation
 * Handles reading/writing NFO files and embedded metadata tags
 */
export class LocalMetadataManager implements ILocalMetadataManager {
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;
  private metadataManager?: MetadataManager;

  constructor(metadataManager?: MetadataManager) {
    this.metadataManager = metadataManager;

    // Configure XML parser for NFO files
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
    });

    // Configure XML builder for NFO files
    this.xmlBuilder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      format: true,
      indentBy: '  ',
      suppressEmptyNode: true,
    });
  }

  /**
   * Read NFO file and parse metadata
   */
  async readNfoFile(filePath: string): Promise<NfoMetadata | null> {
    try {
      // Check if running in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        const content = await (window as any).electron.readFile(filePath);
        return this.parseNfoToMetadata(content);
      }

      // Fallback for web environment (not supported)
      throw new Error('File system access requires Electron environment');
    } catch (error) {
      console.error('Error reading NFO file:', error);
      return null;
    }
  }

  /**
   * Write metadata to NFO file
   */
  async writeNfoFile(filePath: string, metadata: NfoMetadata): Promise<void> {
    try {
      const xmlContent = this.metadataToNfo(metadata);

      // Check if running in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        await (window as any).electron.writeFile(filePath, xmlContent);
        return;
      }

      // Fallback for web environment (not supported)
      throw new Error('File system access requires Electron environment');
    } catch (error) {
      console.error('Error writing NFO file:', error);
      throw error;
    }
  }

  /**
   * Delete NFO file
   */
  async deleteNfoFile(filePath: string): Promise<void> {
    try {
      // Check if running in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        await (window as any).electron.deleteFile(filePath);
        return;
      }

      // Fallback for web environment (not supported)
      throw new Error('File system access requires Electron environment');
    } catch (error) {
      console.error('Error deleting NFO file:', error);
      throw error;
    }
  }

  /**
   * Create backup of existing NFO file
   */
  async backupNfoFile(filePath: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = filePath.replace(/\.nfo$/i, `.${timestamp}.nfo.bak`);

      // Check if running in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        await (window as any).electron.copyFile(filePath, backupPath);
        return backupPath;
      }

      // Fallback for web environment (not supported)
      throw new Error('File system access requires Electron environment');
    } catch (error) {
      console.error('Error backing up NFO file:', error);
      throw error;
    }
  }

  /**
   * Read embedded metadata from media file
   */
  async readEmbeddedMetadata(filePath: string): Promise<EmbeddedMetadata | null> {
    try {
      // Check if running in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        const metadata = await (window as any).electron.readEmbeddedMetadata(filePath);
        return metadata;
      }

      // Fallback for web environment (not supported)
      throw new Error('File system access requires Electron environment');
    } catch (error) {
      console.error('Error reading embedded metadata:', error);
      return null;
    }
  }

  /**
   * Write embedded metadata to media file
   */
  async writeEmbeddedMetadata(
    filePath: string,
    metadata: EmbeddedMetadata
  ): Promise<void> {
    try {
      // Check if running in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        await (window as any).electron.writeEmbeddedMetadata(filePath, metadata);
        return;
      }

      // Fallback for web environment (not supported)
      throw new Error('File system access requires Electron environment');
    } catch (error) {
      console.error('Error writing embedded metadata:', error);
      throw error;
    }
  }

  /**
   * Download image from URL to local file
   */
  async downloadImage(imageUrl: string, destinationPath: string): Promise<void> {
    try {
      console.log('[LocalMetadata] Downloading image:', { imageUrl, destinationPath });
      
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      // Get image data as array buffer
      const arrayBuffer = await response.arrayBuffer();
      
      // Convert to base64 for Electron IPC
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      // Write to file via Electron
      if (typeof window !== 'undefined' && (window as any).electron) {
        await (window as any).electron.writeFile(destinationPath, base64);
        console.log('[LocalMetadata] Image downloaded successfully');
        return;
      }

      throw new Error('File system access requires Electron environment');
    } catch (error) {
      console.error('[LocalMetadata] Error downloading image:', error);
      throw error;
    }
  }

  /**
   * Download trailer from YouTube URL to local file
   */
  async downloadTrailer(
    trailerUrl: string,
    destinationPath: string,
    quality: string = '1080p',
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      console.log('[LocalMetadata] Downloading trailer:', { trailerUrl, destinationPath, quality });
      
      // Check if running in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        // Set up progress listener if callback provided
        if (onProgress) {
          const progressHandler = (_event: any, data: any) => {
            if (data.url === trailerUrl) {
              onProgress(parseFloat(data.percent));
            }
          };
          
          // Listen for progress events
          if ((window as any).electron.on) {
            (window as any).electron.on('youtube:progress', progressHandler);
          }
        }
        
        // Call Electron IPC handler to download
        const result = await (window as any).electron.downloadYouTubeVideo(
          trailerUrl,
          destinationPath,
          quality
        );
        
        console.log('[LocalMetadata] Trailer downloaded successfully:', result);
        return;
      }

      throw new Error('File system access requires Electron environment');
    } catch (error) {
      console.error('[LocalMetadata] Error downloading trailer:', error);
      throw error;
    }
  }

  /**
   * Get poster file path for a media file or directory
   */
  getPosterPath(mediaPath: string): string {
    // Check if mediaPath is a directory (no file extension) or a file
    const hasExtension = /\.[^.\\\/]+$/.test(mediaPath);
    const separator = mediaPath.includes('\\') ? '\\' : '/';
    
    if (hasExtension) {
      // It's a file path, extract directory and filename
      const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
      const dir = mediaPath.substring(0, lastSlash);
      const filename = mediaPath.substring(lastSlash + 1);
      const lastDot = filename.lastIndexOf('.');
      const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
      return `${dir}${separator}${nameWithoutExt}-poster.jpg`;
    } else {
      // It's a directory path, use "poster.jpg" or "folder.jpg"
      return `${mediaPath}${separator}poster.jpg`;
    }
  }

  /**
   * Get fanart (background) file path for a media file or directory
   */
  getFanartPath(mediaPath: string): string {
    // Check if mediaPath is a directory (no file extension) or a file
    const hasExtension = /\.[^.\\\/]+$/.test(mediaPath);
    const separator = mediaPath.includes('\\') ? '\\' : '/';
    
    if (hasExtension) {
      // It's a file path, extract directory and filename
      const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
      const dir = mediaPath.substring(0, lastSlash);
      const filename = mediaPath.substring(lastSlash + 1);
      const lastDot = filename.lastIndexOf('.');
      const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
      return `${dir}${separator}${nameWithoutExt}-fanart.jpg`;
    } else {
      // It's a directory path, use "fanart.jpg"
      return `${mediaPath}${separator}fanart.jpg`;
    }
  }

  /**
   * Get logo file path for a media file or directory
   */
  getLogoPath(mediaPath: string): string {
    // Check if mediaPath is a directory (no file extension) or a file
    const hasExtension = /\.[^.\\\/]+$/.test(mediaPath);
    const separator = mediaPath.includes('\\') ? '\\' : '/';
    
    if (hasExtension) {
      // It's a file path, extract directory and filename
      const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
      const dir = mediaPath.substring(0, lastSlash);
      const filename = mediaPath.substring(lastSlash + 1);
      const lastDot = filename.lastIndexOf('.');
      const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
      return `${dir}${separator}${nameWithoutExt}-clearlogo.png`;
    } else {
      // It's a directory path, use "clearlogo.png"
      return `${mediaPath}${separator}clearlogo.png`;
    }
  }

  /**
   * Get banner file path for a media file or directory
   */
  getBannerPath(mediaPath: string): string {
    const separator = mediaPath.includes('\\') ? '\\' : '/';
    // Check if mediaPath is a directory (no file extension) or a file
    const hasExtension = /\.[^.\\\/]+$/.test(mediaPath);
    
    if (hasExtension) {
      // It's a file path, extract directory
      const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
      const dir = mediaPath.substring(0, lastSlash);
      return `${dir}${separator}banner.jpg`;
    } else {
      // It's already a directory path
      return `${mediaPath}${separator}banner.jpg`;
    }
  }

  /**
   * Get trailer file path for a media file or directory
   * @param mediaPath - Path to the media file or directory
   * @param movieTitle - Title of the movie/show for naming
   * @param quality - Quality/resolution (e.g., "1080p", "720p") - not used in filename
   * @param index - Trailer index (0 for first trailer, 1 for second, etc.)
   */
  getTrailerPath(mediaPath: string, movieTitle: string, quality: string, index: number = 0): string {
    // Check if mediaPath is a directory (no file extension) or a file
    const hasExtension = /\.[^.\\\/]+$/.test(mediaPath);
    
    let dir: string;
    const separator = mediaPath.includes('\\') ? '\\' : '/';
    
    if (hasExtension) {
      // It's a file path, extract the directory
      const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
      dir = mediaPath.substring(0, lastSlash);
    } else {
      // It's already a directory path
      dir = mediaPath;
    }
    
    // Clean the movie title for filename (remove special characters)
    const cleanTitle = movieTitle.replace(/[<>:"/\\|?*]/g, '').trim();
    
    // Don't include quality in filename
    if (index === 0) {
      return `${dir}${separator}${cleanTitle}-trailer.mp4`;
    }
    return `${dir}${separator}${cleanTitle}-trailer${index + 1}.mp4`;
  }

  /**
   * Sync Plex metadata to local files
   */
  async syncToLocal(item: MetadataItem, mode: MetadataSaveMode): Promise<LocalSyncResult> {
    const result: LocalSyncResult = {
      success: false,
      plexUpdated: false,
      nfoUpdated: false,
      embeddedUpdated: false,
      errors: [],
    };

    try {
      // Extract media file path from item
      let mediaPath: string | null = null;
      if (item.Media && item.Media.length > 0) {
        const media = item.Media[0];
        if (media.Part && media.Part.length > 0) {
          mediaPath = media.Part[0].file;
        }
      }

      if (!mediaPath) {
        result.errors.push('Media file path not found');
        return result;
      }

      // Convert Plex metadata to NFO format
      const nfoMetadata = this.plexToNfo(item);

      // Handle NFO export
      if (mode.localFormat === 'nfo' || mode.localFormat === 'both') {
        const nfoPath = this.getNfoPath(mediaPath, item.type);

        // Create backup if requested
        if (mode.createBackup) {
          try {
            await this.backupNfoFile(nfoPath);
          } catch (error) {
            // Backup failed, but continue
            console.warn('Failed to create backup:', error);
          }
        }

        await this.writeNfoFile(nfoPath, nfoMetadata);
        result.nfoUpdated = true;
      }

      // Handle embedded metadata export
      if (mode.localFormat === 'embedded' || mode.localFormat === 'both') {
        const embeddedMetadata = this.plexToEmbedded(item);
        try {
          await this.writeEmbeddedMetadata(mediaPath, embeddedMetadata);
          result.embeddedUpdated = true;
        } catch (error) {
          result.errors.push(
            `Embedded metadata write failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      result.success = result.nfoUpdated || result.embeddedUpdated;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Sync local metadata to Plex
   */
  async syncFromLocal(filePath: string): Promise<MetadataItem> {
    if (!this.metadataManager) {
      throw new Error('MetadataManager not configured');
    }

    // Read NFO file
    const nfoPath = this.getNfoPathFromMedia(filePath);
    const nfoMetadata = await this.readNfoFile(nfoPath);

    if (!nfoMetadata) {
      throw new Error('No NFO metadata found');
    }

    // Convert NFO to Plex metadata update
    const updates = this.nfoToPlexUpdate(nfoMetadata);

    // Get the rating key from the file path
    // This is a placeholder - in reality, we'd need to match the file to a Plex item
    const ratingKey = await this.getRatingKeyFromFilePath(filePath);

    if (!ratingKey) {
      throw new Error('Could not find Plex item for file');
    }

    // Update Plex metadata
    await this.metadataManager.updateMetadata(ratingKey, updates);

    // Return updated metadata
    return await this.metadataManager.getMetadata(ratingKey);
  }

  /**
   * Detect changes between Plex and local metadata
   */
  async detectLocalChanges(item: MetadataItem): Promise<LocalChangeDetection> {
    const result: LocalChangeDetection = {
      hasLocalChanges: false,
      nfoExists: false,
      plexModifiedAt: item.updatedAt,
      conflicts: [],
    };

    try {
      // Get media file path
      const mediaPath = await this.getMediaFilePath(item.ratingKey);
      if (!mediaPath) {
        return result;
      }

      // Check NFO file
      const nfoPath = this.getNfoPath(mediaPath, item.type);
      const nfoMetadata = await this.readNfoFile(nfoPath);

      if (nfoMetadata) {
        result.nfoExists = true;

        // Get NFO file modification time
        if (typeof window !== 'undefined' && (window as any).electron) {
          const stats = await (window as any).electron.getFileStats(nfoPath);
          result.nfoModifiedAt = stats?.mtimeMs;

          // Check if NFO is newer than Plex
          if (result.nfoModifiedAt && result.nfoModifiedAt > item.updatedAt) {
            result.hasLocalChanges = true;

            // Detect specific field conflicts
            if (nfoMetadata.title !== item.title) {
              result.conflicts.push({
                field: 'title',
                plexValue: item.title,
                localValue: nfoMetadata.title,
              });
            }

            if (nfoMetadata.year !== item.year) {
              result.conflicts.push({
                field: 'year',
                plexValue: item.year,
                localValue: nfoMetadata.year,
              });
            }

            if (nfoMetadata.plot !== item.summary) {
              result.conflicts.push({
                field: 'summary',
                plexValue: item.summary,
                localValue: nfoMetadata.plot,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error detecting local changes:', error);
    }

    return result;
  }

  /**
   * Bulk export metadata to local files
   */
  async bulkExportToLocal(
    ratingKeys: string[],
    format: 'nfo' | 'embedded' | 'both'
  ): Promise<BulkExportResult> {
    const result: BulkExportResult = {
      total: ratingKeys.length,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    if (!this.metadataManager) {
      result.errors.push({ ratingKey: 'N/A', error: 'MetadataManager not configured' });
      return result;
    }

    for (const ratingKey of ratingKeys) {
      try {
        // Fetch metadata from Plex
        const item = await this.metadataManager.getMetadata(ratingKey);

        // Sync to local
        const mode: MetadataSaveMode = {
          target: 'local',
          localFormat: format,
          createBackup: true,
          overwriteExisting: true,
        };

        const syncResult = await this.syncToLocal(item, mode);

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
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  /**
   * Validate file system access for a directory
   */
  async validateAccess(directoryPath: string): Promise<AccessValidation> {
    const result: AccessValidation = {
      canRead: false,
      canWrite: false,
      path: directoryPath,
    };

    try {
      // Check if running in Electron environment
      if (typeof window !== 'undefined' && (window as any).electron) {
        const access = await (window as any).electron.checkAccess(directoryPath);
        result.canRead = access.canRead;
        result.canWrite = access.canWrite;
      } else {
        result.error = 'File system access requires Electron environment';
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  /**
   * Get media file path for a rating key
   */
  async getMediaFilePath(ratingKey: string): Promise<string | null> {
    if (!this.metadataManager) {
      console.warn('MetadataManager not configured');
      return null;
    }

    try {
      // Fetch metadata from Plex
      const item = await this.metadataManager.getMetadata(ratingKey);

      // For TV shows and seasons, we need to get the directory path, not a file path
      if (item.type === 'show') {
        // For TV shows, get the show directory from the first season's first episode
        // This is a workaround since shows don't have direct file paths
        if (item.Location && item.Location.length > 0) {
          // Use the Location path if available
          return item.Location[0].path;
        }
        // Otherwise, we need to fetch a child episode to get the path
        console.warn('[LocalMetadataManager] TV show has no Location, cannot determine path');
        return null;
      }

      if (item.type === 'season') {
        // For seasons, get the directory from the first episode
        console.warn('[LocalMetadataManager] Season metadata saving not yet implemented');
        return null;
      }

      // For episodes and movies, extract file path from media info
      if (item.Media && item.Media.length > 0) {
        const media = item.Media[0];
        if (media.Part && media.Part.length > 0) {
          return media.Part[0].file;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting media file path:', error);
      return null;
    }
  }

  /**
   * Parse NFO XML content to metadata object
   */
  private parseNfoToMetadata(xmlContent: string): NfoMetadata {
    const parsed = this.xmlParser.parse(xmlContent);

    // Handle different root elements (movie, tvshow, episodedetails, etc.)
    const root =
      parsed.movie || parsed.tvshow || parsed.episodedetails || parsed.musicvideo || {};

    const metadata: NfoMetadata = {
      title: root.title || '',
    };

    // Map common fields
    if (root.originaltitle) metadata.originalTitle = root.originaltitle;
    if (root.year) metadata.year = parseInt(root.year, 10);
    if (root.plot) metadata.plot = root.plot;
    if (root.tagline) metadata.tagline = root.tagline;
    if (root.rating) metadata.rating = parseFloat(root.rating);
    if (root.mpaa) metadata.mpaa = root.mpaa;
    if (root.studio) metadata.studio = root.studio;
    if (root.premiered) metadata.premiered = root.premiered;
    if (root.thumb) metadata.thumb = root.thumb;
    if (root.fanart) metadata.fanart = root.fanart;

    // Handle arrays
    if (root.genre) {
      metadata.genre = Array.isArray(root.genre) ? root.genre : [root.genre];
    }

    if (root.director) {
      metadata.director = Array.isArray(root.director) ? root.director : [root.director];
    }

    if (root.credits) {
      metadata.credits = Array.isArray(root.credits) ? root.credits : [root.credits];
    }

    if (root.actor) {
      const actors = Array.isArray(root.actor) ? root.actor : [root.actor];
      metadata.actor = actors.map((a: any) => ({
        name: a.name || '',
        role: a.role || '',
        thumb: a.thumb,
      }));
    }

    // TV-specific fields
    if (root.showtitle) metadata.showtitle = root.showtitle;
    if (root.season) metadata.season = parseInt(root.season, 10);
    if (root.episode) metadata.episode = parseInt(root.episode, 10);
    if (root.aired) metadata.aired = root.aired;

    // Music-specific fields
    if (root.artist) metadata.artist = root.artist;
    if (root.album) metadata.album = root.album;
    if (root.track) metadata.track = parseInt(root.track, 10);
    if (root.duration) metadata.duration = parseInt(root.duration, 10);

    return metadata;
  }

  /**
   * Convert metadata object to NFO XML
   */
  private metadataToNfo(metadata: NfoMetadata): string {
    // Determine root element based on content type
    let rootElement = 'movie';
    if (metadata.showtitle) {
      rootElement = metadata.episode ? 'episodedetails' : 'tvshow';
    } else if (metadata.artist) {
      rootElement = 'musicvideo';
    }

    const nfoObject: any = {};
    nfoObject[rootElement] = {};
    const root = nfoObject[rootElement];

    // Map fields
    root.title = metadata.title;
    if (metadata.originalTitle) root.originaltitle = metadata.originalTitle;
    if (metadata.year) root.year = metadata.year;
    if (metadata.plot) root.plot = metadata.plot;
    if (metadata.tagline) root.tagline = metadata.tagline;
    if (metadata.rating) root.rating = metadata.rating;
    if (metadata.mpaa) root.mpaa = metadata.mpaa;
    if (metadata.studio) root.studio = metadata.studio;
    if (metadata.premiered) root.premiered = metadata.premiered;
    if (metadata.thumb) root.thumb = metadata.thumb;
    if (metadata.fanart) root.fanart = metadata.fanart;

    // Arrays
    if (metadata.genre) root.genre = metadata.genre;
    if (metadata.director) root.director = metadata.director;
    if (metadata.credits) root.credits = metadata.credits;
    if (metadata.actor) root.actor = metadata.actor;

    // TV-specific
    if (metadata.showtitle) root.showtitle = metadata.showtitle;
    if (metadata.season) root.season = metadata.season;
    if (metadata.episode) root.episode = metadata.episode;
    if (metadata.aired) root.aired = metadata.aired;

    // Music-specific
    if (metadata.artist) root.artist = metadata.artist;
    if (metadata.album) root.album = metadata.album;
    if (metadata.track) root.track = metadata.track;
    if (metadata.duration) root.duration = metadata.duration;

    return this.xmlBuilder.build(nfoObject);
  }

  /**
   * Convert Plex metadata to NFO format
   */
  private plexToNfo(item: MetadataItem): NfoMetadata {
    const nfo: NfoMetadata = {
      title: item.title,
    };

    if (item.originalTitle) nfo.originalTitle = item.originalTitle;
    if (item.year) nfo.year = item.year;
    if (item.summary) nfo.plot = item.summary;
    if (item.tagline) nfo.tagline = item.tagline;
    if (item.rating) nfo.rating = item.rating;
    if (item.contentRating) nfo.mpaa = item.contentRating;
    if (item.studio) nfo.studio = item.studio;
    if (item.thumb) nfo.thumb = item.thumb;
    if (item.art) nfo.fanart = item.art;

    // Genres
    if (item.genres) {
      nfo.genre = item.genres.map((g) => g.tag);
    }

    // Directors
    if (item.directors) {
      nfo.director = item.directors.map((d) => d.tag);
    }

    // Writers
    if (item.writers) {
      nfo.credits = item.writers.map((w) => w.tag);
    }

    // Cast
    if (item.roles) {
      nfo.actor = item.roles.map((r) => ({
        name: r.tag,
        role: r.role || '',
        thumb: r.thumb,
      }));
    }

    // TV-specific
    if (item.type === 'episode') {
      nfo.showtitle = item.grandparentTitle;
      nfo.season = item.parentIndex;
      nfo.episode = item.index;
    } else if (item.type === 'show') {
      nfo.showtitle = item.title;
    }

    return nfo;
  }

  /**
   * Convert Plex metadata to embedded format
   */
  private plexToEmbedded(item: MetadataItem): EmbeddedMetadata {
    const embedded: EmbeddedMetadata = {};

    // Common fields
    embedded.title = item.title;
    if (item.year) embedded.year = item.year;
    if (item.summary) embedded.comment = item.summary;

    // Genres
    if (item.genres && item.genres.length > 0) {
      embedded.genre = item.genres.map((g) => g.tag);
    }

    // Music-specific fields
    if (item.type === 'track') {
      embedded.artist = item.grandparentTitle;
      embedded.album = item.parentTitle;
      embedded.trackNumber = item.index;
      
      // Album artist (use parent artist if available)
      if (item.parentTitle) {
        embedded.albumArtist = item.grandparentTitle;
      }
      
      // Composer (use first writer if available)
      if (item.writers && item.writers.length > 0) {
        embedded.composer = item.writers[0].tag;
      }
    } else if (item.type === 'album') {
      embedded.album = item.title;
      embedded.artist = item.parentTitle;
      embedded.albumArtist = item.parentTitle;
      if (item.year) embedded.year = item.year;
    }

    // Video-specific fields
    if (item.type === 'movie' || item.type === 'episode') {
      embedded.description = item.summary;
      
      // Director (use first director if available)
      if (item.directors && item.directors.length > 0) {
        embedded.director = item.directors[0].tag;
      }
      
      // Cast (all roles)
      if (item.roles && item.roles.length > 0) {
        embedded.cast = item.roles.map((r) => r.tag);
      }
    }

    return embedded;
  }

  /**
   * Get NFO file path for a media file
   */
  private getNfoPath(mediaPath: string, type: string): string {
    const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
    const dir = mediaPath.substring(0, lastSlash);
    const filename = mediaPath.substring(lastSlash + 1);
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const separator = mediaPath.includes('\\') ? '\\' : '/';

    // Determine NFO filename based on type
    let nfoFilename: string;
    switch (type) {
      case 'show':
        nfoFilename = 'tvshow.nfo';
        break;
      case 'episode':
        nfoFilename = `${nameWithoutExt}.nfo`;
        break;
      case 'movie':
        nfoFilename = `${nameWithoutExt}.nfo`;
        break;
      default:
        nfoFilename = `${nameWithoutExt}.nfo`;
    }

    return `${dir}${separator}${nfoFilename}`;
  }

  /**
   * Get NFO file path from media file path
   */
  private getNfoPathFromMedia(mediaPath: string): string {
    const lastSlash = Math.max(mediaPath.lastIndexOf('/'), mediaPath.lastIndexOf('\\'));
    const dir = mediaPath.substring(0, lastSlash);
    const filename = mediaPath.substring(lastSlash + 1);
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const separator = mediaPath.includes('\\') ? '\\' : '/';
    return `${dir}${separator}${nameWithoutExt}.nfo`;
  }

  /**
   * Convert NFO metadata to Plex metadata update
   */
  private nfoToPlexUpdate(nfo: NfoMetadata): MetadataUpdate {
    const update: MetadataUpdate = {};

    if (nfo.title) update.title = nfo.title;
    if (nfo.originalTitle) update.originalTitle = nfo.originalTitle;
    if (nfo.year) update.year = nfo.year;
    if (nfo.plot) update.summary = nfo.plot;
    if (nfo.tagline) update.tagline = nfo.tagline;
    if (nfo.rating) update.rating = nfo.rating;
    if (nfo.mpaa) update.contentRating = nfo.mpaa;
    if (nfo.studio) update.studio = nfo.studio;

    if (nfo.genre) update.genres = nfo.genre;
    if (nfo.director) update.directors = nfo.director;
    if (nfo.credits) update.writers = nfo.credits;

    if (nfo.actor) {
      update.roles = nfo.actor.map((a) => ({
        tag: a.name,
        role: a.role,
        thumb: a.thumb,
      }));
    }

    return update;
  }

  /**
   * Get rating key from file path
   * Note: This is a placeholder - actual implementation would need to search Plex
   */
  private async getRatingKeyFromFilePath(filePath: string): Promise<string | null> {
    // This would need to search Plex for an item with this file path
    // For now, return null as placeholder
    console.warn('getRatingKeyFromFilePath not yet implemented');
    return null;
  }
}

/**
 * Create a Local Metadata Manager instance
 */
export function createLocalMetadataManager(
  metadataManager?: MetadataManager
): LocalMetadataManager {
  return new LocalMetadataManager(metadataManager);
}
