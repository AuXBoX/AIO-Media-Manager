import { PlexClient } from '@/api/plexClient';
import type { YouTubeTrailer, TrailerSearchOptions } from '@/types/youtube';

// Re-export types for convenience
export type { YouTubeTrailer, TrailerSearchOptions };

/**
 * Known movie studio channels
 */
const STUDIO_CHANNELS = [
  'Universal Pictures',
  'Warner Bros. Pictures',
  'Paramount Pictures',
  'Sony Pictures Entertainment',
  'Walt Disney Studios',
  'Marvel Entertainment',
  'DC',
  '20th Century Studios',
  'Lionsgate Movies',
  'MGM',
  'A24',
  'Focus Features',
  'Searchlight Pictures',
  'DreamWorks',
  'Columbia Pictures',
  'New Line Cinema',
  'Legendary Entertainment',
  'STX Entertainment',
  'Blumhouse Productions',
  'Netflix',
  'Amazon Prime Video',
  'Apple TV',
  'HBO Max',
  'Hulu',
];

/**
 * YouTube Trailer Provider
 * 
 * Scrapes YouTube for movie/TV trailers without requiring an API key.
 * Uses YouTube's internal InnerTube API for searching.
 */
export class YouTubeTrailerProvider {
  private baseURL = 'https://www.youtube.com';
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  constructor(_plexClient: PlexClient) {
    // PlexClient not currently used but kept for API consistency
  }

  /**
   * Make HTTP request using Electron's IPC handler (bypasses CORS)
   */
  private async fetch(path: string, params?: Record<string, string>): Promise<string> {
    if (!window.electron?.fetch) {
      throw new Error('Electron fetch API not available');
    }

    // Build URL with query parameters
    let url = `${this.baseURL}${path}`;
    if (params) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    const response = await window.electron.fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.text;
  }

  /**
   * Search for trailers on YouTube
   */
  async searchTrailers(options: TrailerSearchOptions): Promise<YouTubeTrailer[]> {
    const {
      query,
      year,
      maxResults = 20,
      prioritizeOfficial = true,
      prioritizeStudioChannels = true,
    } = options;

    // Build search query with trailer keywords
    const searchQuery = `${query}${year ? ` ${year}` : ''} official trailer`;

    try {
      // Use YouTube's search page to get initial results
      const searchResults = await this.scrapeYouTubeSearch(searchQuery, maxResults);

      // Score and filter results
      const scoredResults = searchResults.map((result) => {
        let score = 0;

        // Check if title contains "official"
        const titleLower = result.title.toLowerCase();
        if (titleLower.includes('official')) {
          score += prioritizeOfficial ? 50 : 10;
          result.isOfficial = true;
        }

        // Check if title contains "trailer"
        if (titleLower.includes('trailer')) {
          score += 20;
        }

        // Check if channel is a known studio
        const isStudio = STUDIO_CHANNELS.some((studio) =>
          result.channelName.toLowerCase().includes(studio.toLowerCase())
        );
        if (isStudio) {
          score += prioritizeStudioChannels ? 40 : 10;
          result.isStudioChannel = true;
        }

        // Prefer HD trailers
        if (titleLower.includes('hd') || titleLower.includes('1080p') || titleLower.includes('4k')) {
          score += 10;
        }

        // Penalize fan-made trailers
        if (titleLower.includes('fan made') || titleLower.includes('fanmade') || titleLower.includes('fan trailer')) {
          score -= 30;
        }

        // Penalize reaction videos
        if (titleLower.includes('reaction') || titleLower.includes('review')) {
          score -= 20;
        }

        result.score = score;
        return result;
      });

      // Sort by score (highest first)
      scoredResults.sort((a, b) => b.score - a.score);

      return scoredResults;
    } catch (error) {
      console.error('Failed to search YouTube trailers:', error);
      throw new Error('Failed to search for trailers on YouTube');
    }
  }

  /**
   * Scrape YouTube search results using the web interface
   */
  private async scrapeYouTubeSearch(query: string, maxResults: number): Promise<YouTubeTrailer[]> {
    try {
      // Get the YouTube search page
      const html = await this.fetch('/results', {
        search_query: query,
      });

      // Extract the initial data from the page
      const ytInitialDataMatch = html.match(/var ytInitialData = ({.+?});/);
      if (!ytInitialDataMatch || !ytInitialDataMatch[1]) {
        throw new Error('Could not find YouTube initial data');
      }

      const ytInitialData = JSON.parse(ytInitialDataMatch[1]);

      // Navigate through the YouTube data structure
      const contents =
        ytInitialData?.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents;

      if (!contents) {
        return [];
      }

      const results: YouTubeTrailer[] = [];

      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents;
        if (!items) continue;

        for (const item of items) {
          const videoRenderer = item?.videoRenderer;
          if (!videoRenderer) continue;

          const videoId = videoRenderer.videoId;
          if (!videoId) continue;
          
          const title = videoRenderer.title?.runs?.[0]?.text || '';
          const channelName = videoRenderer.ownerText?.runs?.[0]?.text || '';
          const channelId = videoRenderer.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || '';
          const thumbnail = videoRenderer.thumbnail?.thumbnails?.[0]?.url || '';
          const duration = this.parseDuration(videoRenderer.lengthText?.simpleText || '');
          const publishedAt = videoRenderer.publishedTimeText?.simpleText || '';
          const viewCount = this.parseViewCount(videoRenderer.viewCountText?.simpleText || '');

          // Get available qualities (we'll need to fetch this separately)
          const availableQualities = await this.getAvailableQualities(videoId);

          results.push({
            id: videoId,
            title,
            channelName,
            channelId,
            thumbnail,
            duration,
            publishedAt,
            viewCount,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            isOfficial: false,
            isStudioChannel: false,
            score: 0,
            availableQualities,
          });

          if (results.length >= maxResults) {
            break;
          }
        }

        if (results.length >= maxResults) {
          break;
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to scrape YouTube search:', error);
      throw error;
    }
  }

  /**
   * Get available video qualities for a YouTube video
   */
  private async getAvailableQualities(videoId: string): Promise<string[]> {
    try {
      // Fetch the video page to get available formats
      const html = await this.fetch(`/watch`, { v: videoId });

      // Extract player response
      const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
      if (!playerResponseMatch || !playerResponseMatch[1]) {
        return ['360p']; // Default fallback
      }

      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const formats = playerResponse?.streamingData?.formats || [];
      const adaptiveFormats = playerResponse?.streamingData?.adaptiveFormats || [];

      const allFormats = [...formats, ...adaptiveFormats];
      const qualities = new Set<string>();

      for (const format of allFormats) {
        const qualityLabel = format.qualityLabel;
        if (qualityLabel) {
          qualities.add(qualityLabel);
        }
      }

      // Sort qualities by resolution (highest first)
      const sortedQualities = Array.from(qualities).sort((a, b) => {
        const aRes = parseInt(a);
        const bRes = parseInt(b);
        return bRes - aRes;
      });

      return sortedQualities.length > 0 ? sortedQualities : ['360p'];
    } catch (error) {
      console.error('Failed to get available qualities:', error);
      return ['360p']; // Default fallback
    }
  }

  /**
   * Download a trailer in the specified quality
   * 
   * Note: This requires a backend service or electron integration to actually download.
   * For now, this returns the download URL that can be used with yt-dlp or similar tools.
   */
  async getDownloadUrl(
    videoId: string,
    preferredQuality: string = '1080p'
  ): Promise<{ url: string; quality: string }> {
    try {
      // Fetch the video page
      const html = await this.fetch(`/watch`, { v: videoId });

      // Extract player response
      const playerResponseMatch = html.match(/var ytInitialPlayerResponse = ({.+?});/);
      if (!playerResponseMatch || !playerResponseMatch[1]) {
        throw new Error('Could not find player response');
      }

      const playerResponse = JSON.parse(playerResponseMatch[1]);
      const formats = playerResponse?.streamingData?.formats || [];
      const adaptiveFormats = playerResponse?.streamingData?.adaptiveFormats || [];

      const allFormats = [...formats, ...adaptiveFormats];

      // Find the best matching format
      let bestFormat = null;
      let bestQuality = '';

      // Try to find exact match
      for (const format of allFormats) {
        if (format.qualityLabel === preferredQuality && format.url) {
          bestFormat = format;
          bestQuality = format.qualityLabel;
          break;
        }
      }

      // If no exact match, find the closest quality
      if (!bestFormat) {
        const preferredRes = parseInt(preferredQuality);
        let closestDiff = Infinity;

        for (const format of allFormats) {
          if (!format.url || !format.qualityLabel) continue;

          const formatRes = parseInt(format.qualityLabel);
          const diff = Math.abs(formatRes - preferredRes);

          if (diff < closestDiff) {
            closestDiff = diff;
            bestFormat = format;
            bestQuality = format.qualityLabel;
          }
        }
      }

      if (!bestFormat || !bestFormat.url) {
        throw new Error('No suitable format found');
      }

      return {
        url: bestFormat.url,
        quality: bestQuality,
      };
    } catch (error) {
      console.error('Failed to get download URL:', error);
      throw new Error('Failed to get trailer download URL');
    }
  }

  /**
   * Parse YouTube duration string (e.g., "2:34" -> "2m 34s")
   */
  private parseDuration(duration: string): string {
    return duration;
  }

  /**
   * Parse YouTube view count string (e.g., "1.2M views" -> 1200000)
   */
  private parseViewCount(viewCountText: string): number {
    const match = viewCountText.match(/([\d.]+)([KMB]?)/);
    if (!match) return 0;

    const num = parseFloat(match[1] || '0');
    const suffix = match[2];

    switch (suffix) {
      case 'K':
        return Math.floor(num * 1000);
      case 'M':
        return Math.floor(num * 1000000);
      case 'B':
        return Math.floor(num * 1000000000);
      default:
        return Math.floor(num);
    }
  }
}

/**
 * Create a YouTube trailer provider instance
 */
export function createYouTubeTrailerProvider(plexClient: PlexClient): YouTubeTrailerProvider {
  return new YouTubeTrailerProvider(plexClient);
}
