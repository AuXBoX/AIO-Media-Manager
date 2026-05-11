/**
 * SubDL Provider
 * 
 * SubDL.com Subtitle API
 * Documentation: https://subdl.com/api-doc
 * 
 * Simple REST API with API key authentication
 * - No User-Agent registration required
 * - Just need to create a free account and get API key
 * - Supports IMDB ID, TMDB ID, film name, file name search
 * - Multiple language support
 * 
 * Get your API key at: https://subdl.com/panel/register
 */

import type { SubtitleResult, SubtitleSearchParams } from '@/types/subtitle';

interface SubDLConfig {
  apiKey: string;
}

interface SubDLResponse {
  status: boolean;
  results?: Array<{
    imdb_id: string;
    tmdb_id: number;
    type: 'movie' | 'tv';
    name: string;
    sd_id: number;
    first_air_date: string | null;
    year: number;
  }>;
  subtitles?: Array<{
    sd_id: number;
    name: string;
    release_name: string;
    language: string;
    author: string;
    url: string;
    subtitles_id: number;
    season_number?: number;
    episode_number?: number;
    hi: number;
    fps?: number;
    download_count: number;
    votes?: number;
    ratings?: number;
    created_at: string;
    comment?: string;
    releases?: string[];
  }>;
  error?: string;
}

export class SubDLProvider {
  private config: SubDLConfig;
  private baseUrl = 'https://api.subdl.com/api/v1';
  private downloadBaseUrl = 'https://dl.subdl.com';

  constructor(config: SubDLConfig) {
    this.config = config;
  }

  /**
   * Search for subtitles
   */
  async search(params: SubtitleSearchParams): Promise<SubtitleResult[]> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        api_key: this.config.apiKey,
      });

      // Add IMDB ID if available (most reliable)
      if (params.imdbId) {
        queryParams.append('imdb_id', params.imdbId.replace(/^tt/, ''));
      }

      // Add TMDB ID if available
      if (params.tmdbId) {
        queryParams.append('tmdb_id', params.tmdbId.toString());
      }

      // Add film name
      if (params.title) {
        queryParams.append('film_name', params.title);
      }

      // Add type (movie or tv)
      if (params.type) {
        queryParams.append('type', params.type === 'episode' ? 'tv' : 'movie');
      }

      // Add year
      if (params.year) {
        queryParams.append('year', params.year.toString());
      }

      // Add season/episode for TV shows
      if (params.season !== undefined) {
        queryParams.append('season_number', params.season.toString());
      }
      if (params.episode !== undefined) {
        queryParams.append('episode_number', params.episode.toString());
      }

      // Add languages (convert to uppercase, SubDL uses uppercase codes)
      if (params.languages && params.languages.length > 0) {
        const languages = params.languages.map(lang => lang.toUpperCase()).join(',');
        queryParams.append('languages', languages);
      }

      // Request more results
      queryParams.append('subs_per_page', '30');

      // Request additional info
      queryParams.append('comment', '1');
      queryParams.append('releases', '1');
      queryParams.append('hi', '1');

      console.log('[SubDL] Search query:', queryParams.toString());

      // Use Electron's fetch
      if (typeof window === 'undefined' || !window.electron?.fetch) {
        throw new Error('Electron fetch not available. Please restart the application.');
      }

      const response = await window.electron.fetch(
        `${this.baseUrl}/subtitles?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log('[SubDL] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`SubDL API request failed: ${response.statusText}`);
      }

      const data: SubDLResponse = JSON.parse(response.text);

      console.log('[SubDL] Response data:', JSON.stringify(data, null, 2));

      if (!data.status) {
        throw new Error(data.error || 'SubDL API returned error status');
      }

      // Check if we got results
      if (!data.subtitles || data.subtitles.length === 0) {
        console.log('[SubDL] No results found');
        return [];
      }

      console.log('[SubDL] Found', data.subtitles.length, 'results');
      console.log('[SubDL] First subtitle sample:', JSON.stringify(data.subtitles[0], null, 2));

      // Convert to our format
      return data.subtitles.map((item) => this.convertToSubtitleResult(item));
    } catch (error) {
      console.error('[SubDL] Search error:', error);
      throw error;
    }
  }

  /**
   * Download subtitle file
   */
  async download(subtitleUrl: string): Promise<{ content: string; fileName: string }> {
    try {
      console.log('[SubDL] Downloading subtitle:', subtitleUrl);

      // Use Electron's fetch
      if (typeof window === 'undefined' || !window.electron?.fetch) {
        throw new Error('Electron fetch not available. Please restart the application.');
      }

      const response = await window.electron.fetch(subtitleUrl, {
        method: 'GET',
        timeout: 30000,
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // SubDL returns a ZIP file, we need to extract it
      // For now, we'll return the content as-is and handle ZIP extraction in the manager
      // The ZIP typically contains a single SRT file

      // Check if it's a ZIP file
      if (subtitleUrl.endsWith('.zip')) {
        throw new Error(
          'SubDL returns ZIP files. Please download manually from subdl.com and extract the subtitle file.'
        );
      }

      return {
        content: response.text,
        fileName: 'subtitle.srt',
      };
    } catch (error) {
      console.error('[SubDL] Download error:', error);
      throw error;
    }
  }

  /**
   * Convert API subtitle to our format
   */
  private convertToSubtitleResult(item: any): SubtitleResult {
    console.log('[SubDL] Converting item:', JSON.stringify(item, null, 2));
    
    // Extract format from release name or default to srt
    const releaseName = item.release_name || item.name || 'subtitle';
    const extension = releaseName.split('.').pop()?.toLowerCase() || 'srt';
    const validFormats = ['srt', 'ass', 'ssa', 'sub', 'vtt'];
    const format = validFormats.includes(extension) ? extension as 'srt' | 'ass' | 'ssa' | 'sub' | 'vtt' : 'srt';

    // Extract IDs from the URL field
    // URL format: /subtitle/561048-40108.zip
    // We need to extract: sd_id=561048, subtitles_id=40108
    let sdId = item.sd_id;
    let subtitlesId = item.subtitles_id || item.id || item.subtitle_id;
    
    // If IDs are not in the response, extract from URL
    if ((!sdId || !subtitlesId) && item.url) {
      const urlMatch = item.url.match(/\/subtitle\/(\d+)-(\d+)\.zip/);
      if (urlMatch) {
        sdId = urlMatch[1];
        subtitlesId = urlMatch[2];
        console.log('[SubDL] Extracted IDs from URL - sd_id:', sdId, 'subtitles_id:', subtitlesId);
      }
    }
    
    console.log('[SubDL] Final IDs - sd_id:', sdId, 'subtitles_id:', subtitlesId);
    
    if (!sdId || !subtitlesId) {
      console.error('[SubDL] Missing IDs for subtitle:', item);
    }
    
    // Build download URL according to SubDL API docs
    // Format: https://dl.subdl.com/subtitle/{sd_id}-{subtitles_id}.zip
    const downloadUrl = `https://dl.subdl.com/subtitle/${sdId}-${subtitlesId}.zip`;
    
    console.log('[SubDL] Subtitle:', releaseName);
    console.log('[SubDL] Download URL:', downloadUrl);

    return {
      id: `${sdId}-${subtitlesId}`,
      provider: 'subdl.com',
      language: item.language || item.lang || 'Unknown',
      languageCode: (item.language || item.lang || 'en').toLowerCase(),
      fileName: releaseName,
      releaseName: releaseName,
      downloadCount: item.download_count || 0,
      rating: item.ratings || 0,
      format: format,
      uploader: item.author || 'Unknown',
      uploadDate: item.created_at || '',
      url: downloadUrl,
      hearing_impaired: item.hi === true || item.hi === 1,
      fps: item.fps,
    };
  }
}

/**
 * Create SubDL provider instance
 */
export function createSubDLProvider(apiKey: string): SubDLProvider {
  if (!apiKey) {
    throw new Error('SubDL API key is required. Get your free API key at https://subdl.com/panel/register');
  }

  return new SubDLProvider({
    apiKey,
  });
}
