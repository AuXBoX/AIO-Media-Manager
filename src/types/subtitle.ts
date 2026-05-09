/**
 * Subtitle Types
 * 
 * Type definitions for subtitle management including external, embedded, and Plex subtitles
 */

export interface SubtitleResult {
  id: string;
  provider: 'opensubtitles.org' | 'opensubtitles.com';
  language: string;
  languageCode: string; // ISO 639-1 or 639-2
  fileName: string;
  releaseName: string;
  downloadCount: number;
  rating: number;
  format: 'srt' | 'ass' | 'ssa' | 'sub' | 'vtt';
  uploader: string;
  uploadDate: string;
  url: string;
  fileSize?: number;
  fps?: number;
  hearing_impaired?: boolean;
}

export interface LocalSubtitle {
  path: string;
  fileName: string;
  language: string;
  languageCode: string;
  format: string;
  forced: boolean;
  size: number;
  exists: boolean;
}

export interface EmbeddedSubtitle {
  index: number; // Subtitle track index (0, 1, 2, etc.)
  streamIndex: number; // FFmpeg stream index (e.g., 0:s:0, 0:s:1)
  codec: string; // srt, ass, subrip, mov_text, hdmv_pgs_subtitle, dvd_subtitle, etc.
  codecLongName: string; // Full codec name
  language: string; // Full language name (English, Spanish, etc.)
  languageCode: string; // ISO 639-2/B code (eng, spa, etc.)
  title?: string; // Track title/name
  forced: boolean; // Forced subtitle flag
  default: boolean; // Default subtitle flag
  hearing_impaired: boolean; // SDH/HI flag
  format: string; // Subtitle format (SRT, ASS, PGS, etc.)
  disposition: {
    default: number;
    forced: number;
    hearing_impaired: number;
  };
}

export interface PlexSubtitle {
  id: string;
  key: string;
  language: string;
  languageCode: string;
  codec: string;
  selected: boolean;
  forced: boolean;
  external: boolean;
  format?: string;
}

export interface SubtitleSearchParams {
  imdbId?: string;
  title?: string;
  year?: number;
  season?: number;
  episode?: number;
  languages?: string[];
  fileHash?: string;
  fileSize?: number;
}

export interface SubtitleDownloadProgress {
  subtitleId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'downloading' | 'complete' | 'error';
  error?: string;
}

export interface FFmpegProgress {
  operation: 'extract' | 'remove' | 'embed';
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'processing' | 'complete' | 'error';
  error?: string;
  timeElapsed?: number;
  timeRemaining?: number;
}

export interface SubtitleEmbedOptions {
  language: string;
  languageCode: string;
  title?: string;
  forced?: boolean;
  default?: boolean;
  hearingImpaired?: boolean;
  codec?: 'copy' | 'srt' | 'ass' | 'mov_text'; // Codec to use when embedding
}

export interface SubtitleExtractOptions {
  outputFormat?: 'srt' | 'ass' | 'vtt'; // Convert to this format
  outputPath?: string; // Custom output path
}

export interface SubtitleRemoveOptions {
  createBackup?: boolean; // Create backup of original file
  removeAll?: boolean; // Remove all subtitle streams
  streamIndices?: number[]; // Specific streams to remove
}
