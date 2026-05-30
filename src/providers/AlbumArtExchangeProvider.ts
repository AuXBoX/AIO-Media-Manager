import axios, { AxiosInstance } from 'axios';
import { PlexClient } from '@/api/plexClient';
import { MediaType, SearchResult, ExternalMetadata } from '@/types';
import { BaseExternalMetadataProvider } from './ExternalMetadataProvider';

/**
 * AlbumArtExchange Provider Configuration
 */
interface AlbumArtExchangeConfig {
  baseURL?: string;
}

/**
 * AlbumArtExchange Provider
 * 
 * Provides album artwork from AlbumArtExchange.com
 * Supports searching for album covers by album name or artist
 */
export class AlbumArtExchangeProvider extends BaseExternalMetadataProvider {
  readonly provider = 'albumartexchange' as const;
  private client: AxiosInstance;

  constructor(plexClient: PlexClient, config: AlbumArtExchangeConfig = {}) {
    super(plexClient);

    this.client = axios.create({
      baseURL: config.baseURL || 'https://www.albumartexchange.com',
      headers: {
        'User-Agent': 'AIO-Media-Manager/1.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
  }

  /**
   * Search for album artwork
   */
  async search(query: string, type: MediaType, year?: number): Promise<SearchResult[]> {
    // AlbumArtExchange only supports album artwork
    if (type !== 'album' && type !== 'track') {
      return [];
    }

    try {
      const response = await this.client.get('/covers.php', {
        params: { q: query },
        timeout: 10000,
      });

      const html = response.data as string;
      return this.parseSearchResults(html);
    } catch (error) {
      console.error('[AlbumArtExchange] Search failed:', error);
      return [];
    }
  }

  /**
   * Get detailed metadata (album artwork URLs)
   */
  async getDetails(externalId: string): Promise<ExternalMetadata> {
    // External ID format: "album-{albumName}" or direct URL
    if (externalId.startsWith('http')) {
      // Direct image URL
      return {
        externalId,
        title: 'Album Art',
        posters: [externalId],
        provider: 'albumartexchange',
      };
    }

    const separatorIndex = externalId.indexOf('-');
    if (separatorIndex === -1) {
      throw new Error(`Invalid AlbumArtExchange external ID format: ${externalId}`);
    }

    const albumName = externalId.substring(separatorIndex + 1);

    try {
      const response = await this.client.get('/covers.php', {
        params: { q: albumName },
        timeout: 10000,
      });

      const html = response.data as string;
      const posters = this.extractImageUrls(html);

      return {
        externalId,
        title: albumName,
        posters: posters.length > 0 ? posters : undefined,
        provider: 'albumartexchange',
      };
    } catch (error) {
      console.error('[AlbumArtExchange] Get details failed:', error);
      throw error;
    }
  }

  /**
   * Parse search results from HTML
   */
  private parseSearchResults(html: string): SearchResult[] {
    const results: SearchResult[] = [];
    
    // Parse album entries from HTML
    // AlbumArtExchange uses div.album or similar structure
    const albumRegex = /<div[^>]*class="[^"]*album[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"?/gi;
    const matches = html.matchAll(albumRegex);
    
    for (const match of matches) {
      if (matches && results.length >= 25) break;
      
      const albumUrl = match[1];
      const imageUrl = match[2];
      const title = match[3];
      
      if (albumUrl && imageUrl && title) {
        results.push({
          externalId: `album-${title}`,
          title: title.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
          provider: 'albumartexchange',
          thumb: this.ensureFullUrl(imageUrl),
        });
      }
    }

    // Fallback: Try to find any image links in the results
    if (results.length === 0) {
      const imgRegex = /<img[^>]*src="(https?:\/\/[^"]*(?:album|cover|art)[^"]*\.(?:jpg|jpeg|png|webp))"[^>]*(?:alt="([^"]*)")?/gi;
      const imgMatches = html.matchAll(imgRegex);
      
      for (const match of imgMatches) {
        if (results.length >= 10) break;
        
        const imageUrl = match[1];
        const alt = match[2] || 'Album Art';
        
        if (imageUrl) {
          results.push({
            externalId: `album-${alt}`,
            title: alt.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
            provider: 'albumartexchange',
            thumb: this.ensureFullUrl(imageUrl),
          });
        }
      }
    }

    return results;
  }

  /**
   * Extract image URLs from HTML (for getDetails)
   */
  private extractImageUrls(html: string): string[] {
    const urls: string[] = [];
    
    // Look for high-quality album art images
    const imgRegex = /src="(https?:\/\/[^"]*(?:album|cover|art|cdn)[^"]*\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"/gi;
    const matches = html.matchAll(imgRegex);
    
    for (const match of matches) {
      const url = match[1];
      if (url && !urls.includes(url)) {
        urls.push(this.ensureFullUrl(url));
      }
    }

    return urls;
  }

  /**
   * Ensure URL is a full URL (not relative)
   */
  private ensureFullUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `https://www.albumartexchange.com${url.startsWith('/') ? '' : '/'}${url}`;
  }
}

/**
 * Create an AlbumArtExchange provider instance
 */
export function createAlbumArtExchangeProvider(plexClient: PlexClient): AlbumArtExchangeProvider {
  return new AlbumArtExchangeProvider(plexClient);
}
