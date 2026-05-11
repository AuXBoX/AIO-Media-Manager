/**
 * OpenSubtitles Provider (OpenSubtitles.org XML-RPC API)
 * 
 * Legacy OpenSubtitles.org XML-RPC API
 * Documentation: https://trac.opensubtitles.org/projects/opensubtitles/wiki/XMLRPC
 * 
 * This is the legacy API but still functional and doesn't require User-Agent registration.
 * 
 * Free tier limits:
 * - Anonymous: 200 downloads per 24 hours per IP
 * - Rate limit: 40 requests per 10 seconds per IP
 * 
 * No API key required - uses anonymous login
 */

import type { SubtitleResult, SubtitleSearchParams } from '@/types/subtitle';

interface OpenSubtitlesConfig {
  apiKey?: string; // Not used for XML-RPC API
  userAgent?: string; // Optional custom User-Agent
}

interface XMLRPCResponse {
  status: string;
  seconds?: number;
  token?: string;
  data?: any[];
  [key: string]: any;
}

export class OpenSubtitlesProvider {
  private config: OpenSubtitlesConfig;
  private baseUrl = 'https://api.opensubtitles.org/xml-rpc';
  private userAgent: string;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: OpenSubtitlesConfig) {
    this.config = config;
    this.userAgent = config.userAgent || 'TemporaryUserAgent';
  }

  /**
   * Login to OpenSubtitles (anonymous)
   */
  private async login(): Promise<string> {
    // Check if we have a valid token
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      console.log('[OpenSubtitles] Logging in...');
      
      const response = await this.xmlrpcCall('LogIn', [
        '', // username (blank for anonymous)
        '', // password (blank for anonymous)
        'en', // language
        this.userAgent,
      ]);

      console.log('[OpenSubtitles] Login response:', response);

      if (response.status !== '200 OK') {
        console.error('[OpenSubtitles] Login failed with status:', response.status);
        console.error('[OpenSubtitles] Full response:', JSON.stringify(response, null, 2));
        throw new Error(`Login failed: ${response.status}`);
      }

      if (!response.token) {
        console.error('[OpenSubtitles] No token in response:', JSON.stringify(response, null, 2));
        throw new Error('No token returned from login');
      }

      this.token = response.token;
      // Token expires in 15 minutes, refresh after 14 minutes
      this.tokenExpiry = Date.now() + (14 * 60 * 1000);
      
      console.log('[OpenSubtitles] Login successful, token:', this.token.substring(0, 10) + '...');
      return this.token;
    } catch (error) {
      console.error('[OpenSubtitles] Login error:', error);
      
      // Provide more helpful error message
      if (error instanceof Error && error.message.includes('401')) {
        throw new Error(
          'OpenSubtitles login failed (401 Unauthorized). ' +
          'The XML-RPC API may require User-Agent registration or anonymous access may be disabled. ' +
          'Please download subtitles manually from opensubtitles.org and place them next to your video files.'
        );
      }
      
      throw new Error('Failed to connect to OpenSubtitles. Please try again later.');
    }
  }

  /**
   * Search for subtitles
   */
  async search(params: SubtitleSearchParams): Promise<SubtitleResult[]> {
    try {
      const token = await this.login();

      // Build search query
      const searchQuery: any = {};

      // Add IMDB ID if available (most reliable)
      if (params.imdbId) {
        searchQuery.imdbid = params.imdbId.replace(/^tt/, '');
      }

      // Add query (title)
      if (params.title) {
        searchQuery.query = params.title;
      }

      // Add season/episode for TV shows
      if (params.season !== undefined) {
        searchQuery.season = params.season.toString();
      }
      if (params.episode !== undefined) {
        searchQuery.episode = params.episode.toString();
      }

      // Add language (use first language or default to English)
      const language = params.languages && params.languages.length > 0 
        ? this.convertTo3LetterCode(params.languages[0])
        : 'eng';
      searchQuery.sublanguageid = language;

      console.log('[OpenSubtitles] Search query:', searchQuery);

      const response = await this.xmlrpcCall('SearchSubtitles', [
        token,
        [searchQuery],
      ]);

      if (response.status !== '200 OK') {
        throw new Error(`Search failed: ${response.status}`);
      }

      // Check if we got results
      if (!response.data || !Array.isArray(response.data)) {
        console.log('[OpenSubtitles] No results found');
        return [];
      }

      console.log('[OpenSubtitles] Found', response.data.length, 'results');

      // Convert to our format
      return response.data.map((item: any) => this.convertToSubtitleResult(item));
    } catch (error) {
      console.error('[OpenSubtitles] Search error:', error);
      throw error;
    }
  }

  /**
   * Download subtitle file
   */
  async download(subtitleFileId: string): Promise<{ content: string; fileName: string }> {
    try {
      const token = await this.login();

      console.log('[OpenSubtitles] Downloading subtitle:', subtitleFileId);

      const response = await this.xmlrpcCall('DownloadSubtitles', [
        token,
        [subtitleFileId],
      ]);

      if (response.status !== '200 OK') {
        throw new Error(`Download failed: ${response.status}`);
      }

      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        throw new Error('No download data returned');
      }

      const subtitleData = response.data[0];
      
      // The data is base64 encoded and gzipped
      const base64Data = subtitleData.data;
      
      if (!base64Data) {
        throw new Error('No subtitle data in response');
      }

      // Decode base64
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decompress gzip - the data is gzipped
      // We need to use pako library for this
      const pako = await import('pako');
      const decompressed = pako.inflate(bytes);
      const content = new TextDecoder().decode(decompressed);

      return {
        content,
        fileName: `subtitle.srt`,
      };
    } catch (error) {
      console.error('[OpenSubtitles] Download error:', error);
      throw error;
    }
  }

  /**
   * Make XML-RPC call
   */
  private async xmlrpcCall(method: string, params: any[]): Promise<XMLRPCResponse> {
    const xmlRequest = this.buildXMLRPCRequest(method, params);

    console.log('[OpenSubtitles] XML-RPC call:', method);
    console.log('[OpenSubtitles] Request body:', xmlRequest);

    // Use Electron's fetch
    if (typeof window === 'undefined' || !window.electron?.fetch) {
      throw new Error('Electron fetch not available. Please restart the application.');
    }

    const response = await window.electron.fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'User-Agent': this.userAgent,
      },
      body: xmlRequest,
      timeout: 30000,
    });

    console.log('[OpenSubtitles] Response status:', response.status);
    console.log('[OpenSubtitles] Response text:', response.text.substring(0, 500));

    if (!response.ok) {
      throw new Error(`XML-RPC request failed: ${response.statusText}`);
    }

    // Parse XML-RPC response
    return this.parseXMLRPCResponse(response.text);
  }

  /**
   * Build XML-RPC request
   */
  private buildXMLRPCRequest(method: string, params: any[]): string {
    const paramsXML = params.map(param => this.valueToXML(param)).join('\n    ');
    
    return `<?xml version="1.0"?>
<methodCall>
  <methodName>${method}</methodName>
  <params>
    ${paramsXML}
  </params>
</methodCall>`;
  }

  /**
   * Convert JavaScript value to XML-RPC param
   */
  private valueToXML(value: any): string {
    return `<param><value>${this.valueToXMLInner(value)}</value></param>`;
  }

  /**
   * Convert value to XML (inner, without param wrapper)
   */
  private valueToXMLInner(value: any): string {
    if (typeof value === 'string') {
      return `<string>${this.escapeXML(value)}</string>`;
    } else if (typeof value === 'number') {
      return `<int>${value}</int>`;
    } else if (typeof value === 'boolean') {
      return `<boolean>${value ? '1' : '0'}</boolean>`;
    } else if (Array.isArray(value)) {
      const items = value.map(item => `<value>${this.valueToXMLInner(item)}</value>`).join('\n        ');
      return `<array><data>\n        ${items}\n      </data></array>`;
    } else if (typeof value === 'object' && value !== null) {
      const members = Object.keys(value).map(key => 
        `<member><name>${key}</name><value>${this.valueToXMLInner(value[key])}</value></member>`
      ).join('\n        ');
      return `<struct>\n        ${members}\n      </struct>`;
    }
    return '<string></string>';
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Parse XML-RPC response
   */
  private parseXMLRPCResponse(xml: string): XMLRPCResponse {
    // Check for fault
    if (xml.includes('<fault>')) {
      const faultMatch = xml.match(/<string>([^<]+)<\/string>/);
      throw new Error(faultMatch ? faultMatch[1] : 'XML-RPC fault');
    }

    const result: XMLRPCResponse = { status: '' };
    
    // Extract struct members from the response
    const memberRegex = /<member>\s*<name>([^<]+)<\/name>\s*<value>([^]*?)<\/value>\s*<\/member>/g;
    let match;
    
    while ((match = memberRegex.exec(xml)) !== null) {
      const name = match[1];
      const valueXML = match[2];
      result[name] = this.parseXMLValue(valueXML);
    }

    return result;
  }

  /**
   * Parse XML value
   */
  private parseXMLValue(xml: string): any {
    // String
    const stringMatch = xml.match(/<string>([^<]*)<\/string>/);
    if (stringMatch) {
      return stringMatch[1];
    }

    // Int
    const intMatch = xml.match(/<int>([^<]+)<\/int>/);
    if (intMatch) {
      return parseInt(intMatch[1], 10);
    }

    // Double
    const doubleMatch = xml.match(/<double>([^<]+)<\/double>/);
    if (doubleMatch) {
      return parseFloat(doubleMatch[1]);
    }

    // Boolean
    const boolMatch = xml.match(/<boolean>([^<]+)<\/boolean>/);
    if (boolMatch) {
      return boolMatch[1] === '1';
    }

    // Array
    if (xml.includes('<array>')) {
      return this.parseXMLArray(xml);
    }

    // Struct
    if (xml.includes('<struct>')) {
      const struct: any = {};
      const memberRegex = /<member>\s*<name>([^<]+)<\/name>\s*<value>([^]*?)<\/value>\s*<\/member>/g;
      let match;
      
      while ((match = memberRegex.exec(xml)) !== null) {
        struct[match[1]] = this.parseXMLValue(match[2]);
      }
      
      return struct;
    }

    return null;
  }

  /**
   * Parse XML array
   */
  private parseXMLArray(xml: string): any[] {
    const result: any[] = [];
    
    // Extract data section
    const dataMatch = xml.match(/<data>([^]*?)<\/data>/);
    if (!dataMatch) return result;
    
    const dataXML = dataMatch[1];
    const valueRegex = /<value>([^]*?)<\/value>/g;
    let match;
    
    while ((match = valueRegex.exec(dataXML)) !== null) {
      result.push(this.parseXMLValue(match[1]));
    }
    
    return result;
  }

  /**
   * Convert API subtitle to our format
   */
  private convertToSubtitleResult(item: any): SubtitleResult {
    // Extract format from filename
    const fileName = item.SubFileName || 'subtitle.srt';
    const extension = fileName.split('.').pop()?.toLowerCase() || 'srt';
    const validFormats = ['srt', 'ass', 'ssa', 'sub', 'vtt'];
    const format = validFormats.includes(extension) ? extension as 'srt' | 'ass' | 'ssa' | 'sub' | 'vtt' : 'srt';

    return {
      id: item.IDSubtitleFile,
      provider: 'opensubtitles.org',
      language: item.LanguageName || 'Unknown',
      languageCode: item.SubLanguageID || 'en',
      fileName: fileName,
      releaseName: item.MovieReleaseName || item.SubFileName || '',
      downloadCount: parseInt(item.SubDownloadsCnt || '0', 10),
      rating: parseFloat(item.SubRating || '0'),
      format: format,
      uploader: item.UserNickName || 'Unknown',
      uploadDate: item.SubAddDate || '',
      url: item.IDSubtitleFile, // Store file ID for download
      hearing_impaired: item.SubHearingImpaired === '1',
      fps: item.MovieFPS ? parseFloat(item.MovieFPS) : undefined,
    };
  }

  /**
   * Convert 2-letter language code to 3-letter code
   */
  private convertTo3LetterCode(code: string): string {
    const codeMap: Record<string, string> = {
      'en': 'eng',
      'es': 'spa',
      'fr': 'fre',
      'de': 'ger',
      'it': 'ita',
      'pt': 'por',
      'ru': 'rus',
      'ja': 'jpn',
      'zh': 'chi',
      'ko': 'kor',
      'ar': 'ara',
      'nl': 'dut',
      'pl': 'pol',
      'sv': 'swe',
      'tr': 'tur',
      'da': 'dan',
      'fi': 'fin',
      'no': 'nor',
      'cs': 'cze',
      'el': 'gre',
      'he': 'heb',
      'hi': 'hin',
      'hu': 'hun',
      'id': 'ind',
      'ro': 'rum',
      'th': 'tha',
      'vi': 'vie',
    };

    // If already 3-letter code, return as-is
    if (code.length === 3) {
      return code.toLowerCase();
    }

    return codeMap[code.toLowerCase()] || 'eng';
  }
}

/**
 * Create OpenSubtitles provider instance
 */
export function createOpenSubtitlesProvider(apiKey?: string): OpenSubtitlesProvider {
  return new OpenSubtitlesProvider({
    apiKey,
  });
}
