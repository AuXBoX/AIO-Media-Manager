/**
 * FFmpegManager
 * 
 * Manages FFmpeg operations for video files including subtitle extraction, removal, and embedding
 */

import type { 
  EmbeddedSubtitle, 
  FFmpegProgress, 
  SubtitleEmbedOptions, 
  SubtitleExtractOptions, 
  SubtitleRemoveOptions 
} from '@/types/subtitle';

export class FFmpegManager {
  /**
   * Get embedded subtitles from video file using FFprobe
   */
  async getEmbeddedSubtitles(mediaFilePath: string): Promise<EmbeddedSubtitle[]> {
    // Check if running in Electron
    if (typeof window === 'undefined' || !window.electron) {
      return [];
    }

    try {
      // Use Electron IPC to call FFprobe
      const streams = await window.electron.ffprobe(mediaFilePath);
      
      if (!streams || streams.length === 0) {
        return [];
      }

      // Filter subtitle streams
      const subtitleStreams = streams.filter((stream: any) => stream.codec_type === 'subtitle');
      
      // Convert to EmbeddedSubtitle format
      const embeddedSubtitles: EmbeddedSubtitle[] = [];
      
      for (let i = 0; i < subtitleStreams.length; i++) {
        const stream = subtitleStreams[i];
        
        embeddedSubtitles.push({
          index: i,
          streamIndex: stream.index,
          codec: stream.codec_name || 'unknown',
          codecLongName: stream.codec_long_name || 'Unknown',
          language: this.getLanguageName(stream.tags?.language || 'und'),
          languageCode: stream.tags?.language || 'und',
          title: stream.tags?.title,
          forced: stream.disposition?.forced === 1,
          default: stream.disposition?.default === 1,
          hearing_impaired: stream.disposition?.hearing_impaired === 1,
          format: this.getSubtitleFormat(stream.codec_name),
          disposition: {
            default: stream.disposition?.default || 0,
            forced: stream.disposition?.forced || 0,
            hearing_impaired: stream.disposition?.hearing_impaired || 0,
          },
        });
      }

      return embeddedSubtitles;
    } catch (error) {
      console.error('Error getting embedded subtitles:', error);
      return [];
    }
  }

  /**
   * Extract subtitle from video file
   */
  async extractSubtitle(
    mediaFilePath: string,
    subtitleIndex: number,
    options: SubtitleExtractOptions = {},
    onProgress?: (progress: FFmpegProgress) => void
  ): Promise<string> {
    // Check if running in Electron
    if (typeof window === 'undefined' || !window.electron) {
      throw new Error('Electron API not available');
    }

    try {
      // Get directory and filename
      const lastSlash = Math.max(
        mediaFilePath.lastIndexOf('/'),
        mediaFilePath.lastIndexOf('\\')
      );
      const directory = mediaFilePath.substring(0, lastSlash);
      const filename = mediaFilePath.substring(lastSlash + 1);
      const lastDot = filename.lastIndexOf('.');
      const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;

      // Determine output format
      const outputFormat = options.outputFormat || 'srt';
      
      // Build output path
      const outputPath = options.outputPath || 
        `${directory}/${nameWithoutExt}.${subtitleIndex}.${outputFormat}`;

      // Call Electron IPC to extract subtitle
      const result = await window.electron.ffmpegExtractSubtitle(
        mediaFilePath,
        subtitleIndex,
        outputPath,
        outputFormat
      );

      return result.outputPath;
    } catch (error) {
      console.error('Error extracting subtitle:', error);
      throw error;
    }
  }

  /**
   * Remove subtitle streams from video file
   */
  async removeSubtitles(
    mediaFilePath: string,
    options: SubtitleRemoveOptions = {},
    onProgress?: (progress: FFmpegProgress) => void
  ): Promise<string> {
    // Check if running in Electron
    if (typeof window === 'undefined' || !window.electron) {
      throw new Error('Electron API not available');
    }

    try {
      // Get directory and filename
      const lastSlash = Math.max(
        mediaFilePath.lastIndexOf('/'),
        mediaFilePath.lastIndexOf('\\')
      );
      const directory = mediaFilePath.substring(0, lastSlash);
      const filename = mediaFilePath.substring(lastSlash + 1);
      const lastDot = filename.lastIndexOf('.');
      const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
      const extension = lastDot > 0 ? filename.substring(lastDot) : '.mkv';

      // Create backup if requested
      if (options.createBackup) {
        const backupPath = `${directory}/${nameWithoutExt}.backup${extension}`;
        await window.electron.copyFile(mediaFilePath, backupPath);
      }

      // Build output path (temporary file)
      const outputPath = `${directory}/${nameWithoutExt}.temp${extension}`;

      // Call Electron IPC to remove subtitles
      const result = await window.electron.ffmpegRemoveSubtitles(
        mediaFilePath,
        outputPath,
        options.removeAll || false,
        options.streamIndices || []
      );

      // Replace original file with new file
      await window.electron.deleteFile(mediaFilePath);
      await window.electron.copyFile(outputPath, mediaFilePath);
      await window.electron.deleteFile(outputPath);

      return mediaFilePath;
    } catch (error) {
      console.error('Error removing subtitles:', error);
      throw error;
    }
  }

  /**
   * Embed subtitle file into video
   */
  async embedSubtitle(
    mediaFilePath: string,
    subtitleFilePath: string,
    options: SubtitleEmbedOptions,
    onProgress?: (progress: FFmpegProgress) => void
  ): Promise<string> {
    // Check if running in Electron
    if (typeof window === 'undefined' || !window.electron) {
      throw new Error('Electron API not available');
    }

    try {
      // Get directory and filename
      const lastSlash = Math.max(
        mediaFilePath.lastIndexOf('/'),
        mediaFilePath.lastIndexOf('\\')
      );
      const directory = mediaFilePath.substring(0, lastSlash);
      const filename = mediaFilePath.substring(lastSlash + 1);
      const lastDot = filename.lastIndexOf('.');
      const nameWithoutExt = lastDot > 0 ? filename.substring(0, lastDot) : filename;
      const extension = lastDot > 0 ? filename.substring(lastDot) : '.mkv';

      // Build output path (temporary file)
      const outputPath = `${directory}/${nameWithoutExt}.temp${extension}`;

      // Call Electron IPC to embed subtitle
      const result = await window.electron.ffmpegEmbedSubtitle(
        mediaFilePath,
        subtitleFilePath,
        outputPath,
        {
          language: options.languageCode,
          title: options.title,
          forced: options.forced || false,
          default: options.default || false,
          codec: options.codec || 'copy',
        }
      );

      // Replace original file with new file
      await window.electron.deleteFile(mediaFilePath);
      await window.electron.copyFile(outputPath, mediaFilePath);
      await window.electron.deleteFile(outputPath);

      return mediaFilePath;
    } catch (error) {
      console.error('Error embedding subtitle:', error);
      throw error;
    }
  }

  /**
   * Get subtitle format from codec name
   */
  private getSubtitleFormat(codecName: string): string {
    const formatMap: Record<string, string> = {
      'subrip': 'SRT',
      'srt': 'SRT',
      'ass': 'ASS',
      'ssa': 'SSA',
      'mov_text': 'MOV_TEXT',
      'hdmv_pgs_subtitle': 'PGS',
      'dvd_subtitle': 'VOBSUB',
      'webvtt': 'VTT',
      'text': 'TXT',
    };

    return formatMap[codecName.toLowerCase()] || codecName.toUpperCase();
  }

  /**
   * Get full language name from code
   */
  private getLanguageName(code: string): string {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'eng': 'English',
      'es': 'Spanish',
      'spa': 'Spanish',
      'fr': 'French',
      'fra': 'French',
      'de': 'German',
      'deu': 'German',
      'ger': 'German',
      'it': 'Italian',
      'ita': 'Italian',
      'pt': 'Portuguese',
      'por': 'Portuguese',
      'ru': 'Russian',
      'rus': 'Russian',
      'ja': 'Japanese',
      'jpn': 'Japanese',
      'zh': 'Chinese',
      'chi': 'Chinese',
      'zho': 'Chinese',
      'ko': 'Korean',
      'kor': 'Korean',
      'ar': 'Arabic',
      'ara': 'Arabic',
      'nl': 'Dutch',
      'nld': 'Dutch',
      'pl': 'Polish',
      'pol': 'Polish',
      'sv': 'Swedish',
      'swe': 'Swedish',
      'tr': 'Turkish',
      'tur': 'Turkish',
      'und': 'Unknown',
    };

    return languageMap[code.toLowerCase()] || code.toUpperCase();
  }
}

/**
 * Create a new FFmpegManager instance
 */
export function createFFmpegManager(): FFmpegManager {
  return new FFmpegManager();
}
