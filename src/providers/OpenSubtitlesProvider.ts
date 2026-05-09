/**
 * OpenSubtitles Provider
 * 
 * Integrates with OpenSubtitles.com API for subtitle search and download
 * API Documentation: https://opensubtitles.stoplight.io/docs/opensubtitles-api
 */

import type { SubtitleResult, SubtitleSearchParams } from '@/types/subtitle';

interface OpenSubtitlesConfig {
  apiKey: string;
  userAgent: string;
}

interface OpenSubtitlesSearchResponse {
  total_pages: number;
  total_count: number;
  page: number;
  data: OpenSubtitlesSubtitle[];
}

interface OpenSubtitlesSubtitle {
  id: string;
  type: string;
  attributes: {
    subtitle_id: string;
    language: string;
    download_count: number;
    new_download_count: number;
    hearing_impaired: boolean;
    hd: boolean;
    fps: number;
    votes: number;
    points: number;
    ratings: number;
    from_trusted: boolean;
    foreign_parts_only: boolean;
    upload_date: string;
    ai_translated: boolean;
    machine_translated: boolean;
    release: string;
    comments: string;
    legacy_subtitle_id: number;
    uploader: {
      uploader_id: number;
      name: string;
      rank: string;
    };
    feature_details: {
      feature_id: number;
      feature_type: string;
      year: number;
      title: string;
      movie_name: string;
      imdb_id: number;
      tmdb_id: number;
    };
    url: string;
    related_links: {
      label: string;
      url: string;
      img_url: string;
    }[];
    files: {
      file_id: number;
      cd_number: number;
      file_name: string;
    }[];
    moviehash_match: boolean;
  };
}

interface OpenSubtitlesDownloadResponse {
  link: string;
  file_name: string;
  requests: number;
  remaining: number;
  message: string;
  reset_time: string;
  reset_time_utc: string;
}

export class OpenSubtitlesProvider {
  private config: OpenSubtitlesConfig;
  private baseUrl = 'https://api.opensubtitles.com/api/v1';
  private token: string | null = null;

  constructor(config: OpenSubtitlesConfig) {
    this.config = config;
  }

  /**
   * Login to OpenSubtitles API
   * Required before making any requests
   */
  async login(username?: string, password?: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey,
          'User-Agent': this.config.userAgent,
        },
        body: JSON.stringify({
          username: username || '',
          password: password || '',
        }),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const data = await response.json();
      this.token = data.token;
    } catch (error) {
      console.error('OpenSubtitles login error:', error);
      throw error;
    }
  }

  /**
   * Search for subtitles
   */
  async search(params: SubtitleSearchParams): Promise<SubtitleResult[]> {
    if (!this.token) {
      await this.login();
    }

    try {
      const queryParams = new URLSearchParams();

      // Add search parameters
      if (params.imdbId) {
        // Remove 'tt' prefix if present
        const imdbId = params.imdbId.replace(/^tt/, '');
        queryParams.append('imdb_id', imdbId);
      }

      if (params.title) {
        queryParams.append('query', params.title);
      }

      if (params.year) {
        queryParams.append('year', params.year.toString());
      }

      if (params.season) {
        queryParams.append('season_number', params.season.toString());
      }

      if (params.episode) {
        queryParams.append('episode_number', params.episode.toString());
      }

      if (params.languages && params.languages.length > 0) {
        queryParams.append('languages', params.languages.join(','));
      }

      if (params.fileHash) {
        queryParams.append('moviehash', params.fileHash);
      }

      const response = await fetch(`${this.baseUrl}/subtitles?${queryParams}`, {
        method: 'GET',
        headers: {
          'Api-Key': this.config.apiKey,
          'Authorization': `Bearer ${this.token}`,
          'User-Agent': this.config.userAgent,
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: OpenSubtitlesSearchResponse = await response.json();

      // Convert to our SubtitleResult format
      return data.data.map((subtitle) => this.convertToSubtitleResult(subtitle));
    } catch (error) {
      console.error('OpenSubtitles search error:', error);
      throw error;
    }
  }

  /**
   * Download subtitle file
   */
  async download(fileId: number): Promise<{ content: string; fileName: string }> {
    if (!this.token) {
      await this.login();
    }

    try {
      // Request download link
      const response = await fetch(`${this.baseUrl}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey,
          'Authorization': `Bearer ${this.token}`,
          'User-Agent': this.config.userAgent,
        },
        body: JSON.stringify({
          file_id: fileId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Download request failed: ${response.statusText}`);
      }

      const downloadData: OpenSubtitlesDownloadResponse = await response.json();

      // Download the actual file
      const fileResponse = await fetch(downloadData.link);

      if (!fileResponse.ok) {
        throw new Error(`File download failed: ${fileResponse.statusText}`);
      }

      const content = await fileResponse.text();

      return {
        content,
        fileName: downloadData.file_name,
      };
    } catch (error) {
      console.error('OpenSubtitles download error:', error);
      throw error;
    }
  }

  /**
   * Get download info (check rate limits)
   */
  async getDownloadInfo(fileId: number): Promise<OpenSubtitlesDownloadResponse> {
    if (!this.token) {
      await this.login();
    }

    try {
      const response = await fetch(`${this.baseUrl}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.config.apiKey,
          'Authorization': `Bearer ${this.token}`,
          'User-Agent': this.config.userAgent,
        },
        body: JSON.stringify({
          file_id: fileId,
          sub_format: 'srt', // Request SRT format
        }),
      });

      if (!response.ok) {
        throw new Error(`Download info request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OpenSubtitles download info error:', error);
      throw error;
    }
  }

  /**
   * Calculate file hash for better matching
   * OpenSubtitles uses a specific hash algorithm
   */
  async calculateFileHash(filePath: string): Promise<string | null> {
    // Check if running in Electron
    if (typeof window === 'undefined' || !window.electron) {
      return null;
    }

    try {
      // This would need to be implemented in Electron main process
      // OpenSubtitles hash algorithm:
      // 1. Take first and last 64KB of file
      // 2. Add file size
      // 3. Calculate hash
      
      // For now, return null - will implement in Phase 4
      return null;
    } catch (error) {
      console.error('Error calculating file hash:', error);
      return null;
    }
  }

  /**
   * Convert OpenSubtitles subtitle to our format
   */
  private convertToSubtitleResult(subtitle: OpenSubtitlesSubtitle): SubtitleResult {
    const attrs = subtitle.attributes;
    
    return {
      id: attrs.subtitle_id,
      provider: 'opensubtitles.com',
      language: this.getLanguageName(attrs.language),
      languageCode: attrs.language,
      fileName: attrs.files[0]?.file_name || 'subtitle.srt',
      releaseName: attrs.release,
      downloadCount: attrs.download_count,
      rating: attrs.ratings,
      format: 'srt', // OpenSubtitles primarily uses SRT
      uploader: attrs.uploader.name,
      uploadDate: attrs.upload_date,
      url: attrs.url,
      fileSize: undefined,
      fps: attrs.fps,
      hearing_impaired: attrs.hearing_impaired,
    };
  }

  /**
   * Get full language name from code
   */
  private getLanguageName(code: string): string {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'zh': 'Chinese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'nl': 'Dutch',
      'pl': 'Polish',
      'sv': 'Swedish',
      'tr': 'Turkish',
      'da': 'Danish',
      'fi': 'Finnish',
      'no': 'Norwegian',
      'cs': 'Czech',
      'el': 'Greek',
      'he': 'Hebrew',
      'hi': 'Hindi',
      'hu': 'Hungarian',
      'id': 'Indonesian',
      'ro': 'Romanian',
      'th': 'Thai',
      'vi': 'Vietnamese',
    };

    return languageMap[code.toLowerCase()] || code.toUpperCase();
  }

  /**
   * Logout from OpenSubtitles API
   */
  async logout(): Promise<void> {
    if (!this.token) {
      return;
    }

    try {
      await fetch(`${this.baseUrl}/logout`, {
        method: 'DELETE',
        headers: {
          'Api-Key': this.config.apiKey,
          'Authorization': `Bearer ${this.token}`,
          'User-Agent': this.config.userAgent,
        },
      });

      this.token = null;
    } catch (error) {
      console.error('OpenSubtitles logout error:', error);
    }
  }
}

/**
 * Create OpenSubtitles provider instance
 */
export function createOpenSubtitlesProvider(apiKey: string): OpenSubtitlesProvider {
  return new OpenSubtitlesProvider({
    apiKey,
    userAgent: 'AIO Media Manager v0.1.0',
  });
}
