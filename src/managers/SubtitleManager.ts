/**
 * SubtitleManager
 * 
 * Manages subtitle operations including scanning, saving, and FFmpeg operations
 */

import type { LocalSubtitle, EmbeddedSubtitle } from '@/types/subtitle';
import { createFFmpegManager } from '@/managers/FFmpegManager';

export class SubtitleManager {
  /**
   * Scan directory for local subtitle files
   */
  async scanSubtitles(mediaFilePath: string): Promise<LocalSubtitle[]> {
    // Check if running in Electron
    if (typeof window === 'undefined' || !window.electron) {
      return [];
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

      // Scan for subtitle files
      const subtitleFiles = await window.electron.scanForSubtitles(directory, nameWithoutExt);
      
      if (!subtitleFiles || subtitleFiles.length === 0) {
        return [];
      }

      // Parse subtitle files
      const subtitles: LocalSubtitle[] = [];
      
      for (const file of subtitleFiles) {
        const parsed = this.parseSubtitleFileName(file);
        if (parsed) {
          subtitles.push({
            path: `${directory}/${file}`,
            fileName: file,
            language: parsed.language,
            languageCode: parsed.languageCode,
            format: parsed.format,
            forced: parsed.forced,
            size: 0, // Will be populated by file system
            exists: true,
          });
        }
      }

      return subtitles;
    } catch (error) {
      console.error('Error scanning for subtitles:', error);
      return [];
    }
  }

  /**
   * Parse subtitle filename to extract language and metadata
   */
  private parseSubtitleFileName(fileName: string): {
    language: string;
    languageCode: string;
    format: string;
    forced: boolean;
  } | null {
    // Extract extension
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) return null;
    
    const format = fileName.substring(lastDot + 1).toLowerCase();
    if (!['srt', 'ass', 'ssa', 'sub', 'vtt'].includes(format)) {
      return null;
    }

    // Check for forced flag
    const forced = fileName.toLowerCase().includes('.forced.');

    // Extract language code
    // Pattern: filename.[lang].srt or filename.[lang].forced.srt
    const parts = fileName.split('.');
    let languageCode = '';
    
    // Look for 2 or 3 letter language code
    for (let i = parts.length - 2; i >= 0; i--) {
      const part = parts[i].toLowerCase();
      if (part === 'forced') continue;
      if (part.length === 2 || part.length === 3) {
        languageCode = part;
        break;
      }
    }

    // Map language code to full name
    const language = this.getLanguageName(languageCode);

    return {
      language,
      languageCode,
      format,
      forced,
    };
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
    };

    return languageMap[code.toLowerCase()] || code.toUpperCase();
  }

  /**
   * Get embedded subtitles from video file using FFprobe
   */
  async getEmbeddedSubtitles(mediaFilePath: string): Promise<EmbeddedSubtitle[]> {
    const ffmpegManager = createFFmpegManager();
    return ffmpegManager.getEmbeddedSubtitles(mediaFilePath);
  }

  /**
   * Save subtitle content to file
   */
  async saveSubtitle(
    content: string,
    mediaFilePath: string,
    language: string,
    forced: boolean = false
  ): Promise<string> {
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

      // Build subtitle filename
      const forcedSuffix = forced ? '.forced' : '';
      const subtitleFileName = `${nameWithoutExt}.${language}${forcedSuffix}.srt`;
      const subtitlePath = `${directory}/${subtitleFileName}`;

      // Save file using Electron IPC
      await window.electron.writeFile(subtitlePath, content);

      return subtitlePath;
    } catch (error) {
      console.error('Error saving subtitle:', error);
      throw error;
    }
  }

  /**
   * Delete subtitle file
   */
  async deleteSubtitle(subtitlePath: string): Promise<void> {
    if (typeof window === 'undefined' || !window.electron) {
      throw new Error('Electron API not available');
    }

    try {
      await window.electron.deleteFile(subtitlePath);
    } catch (error) {
      console.error('Error deleting subtitle:', error);
      throw error;
    }
  }

  /**
   * Validate subtitle content
   */
  validateSubtitle(content: string): boolean {
    // Basic validation - check if content looks like a subtitle file
    if (!content || content.trim().length === 0) {
      return false;
    }

    // Check for SRT format (most common)
    const srtPattern = /^\d+\s*\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/m;
    if (srtPattern.test(content)) {
      return true;
    }

    // Check for ASS/SSA format
    if (content.includes('[Script Info]') || content.includes('[V4+ Styles]')) {
      return true;
    }

    // Check for VTT format
    if (content.startsWith('WEBVTT')) {
      return true;
    }

    return false;
  }
}

/**
 * Create a new SubtitleManager instance
 */
export function createSubtitleManager(): SubtitleManager {
  return new SubtitleManager();
}
