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
  username?: string; // OpenSubtitles.org username
  password?: string; // OpenSubtitles.org password
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
   * Login to OpenSubtitles (with credentials or anonymous)
   */
  private async login(): Promise<string> {
    // Check if we have a valid token
    if (this.token && Date.now() < this.tokenExpiry) {
      return this.token;
    }

    try {
      const username = this.config.username || '';
      const password = this.config.password || '';
      const isAnonymous = !username || !password;

      console.log(`[OpenSubtitles] Logging in (${isAnonymous ? 'anonymous' : 'authenticated'})...`);
      
      const response = await this.xmlrpcCall('LogIn', [
        username,
        password,
        'en', // language
        this.userAgent,
      ]);

      console.log('[OpenSubtitles] Login response status:', response.status);

      if (response.status !== '200 OK') {
        console.error('[OpenSubtitles] Login failed with status:', response.status);
        if (isAnonymous) {
          throw new Error(
            'OpenSubtitles anonymous login failed (401 Unauthorized). ' +
            'Anonymous access has been disabled. ' +
            'Please add your OpenSubtitles.org username and password in Settings > API Keys.'
          );
        }
        throw new Error(`Login failed: ${response.status}. Please check your credentials.`);
      }

      if (!response.token) {
        console.error('[OpenSubtitles] No token in response');
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
          'Please add your OpenSubtitles.org username and password in Settings > API Keys. ' +
          'Create a free account at opensubtitles.org if you don\'t have one.'
        );
      }
      
      throw error instanceof Error ? error : new Error('Failed to connect to OpenSubtitles. Please try again later.');
    }
  }

  /**
   * Search for subtitles
   */
  async search(params: SubtitleSearchParams): Promise<SubtitleResult[]> {
    try {
      const token = await this.login();

      // Build search query - prefer IMDB ID (most reliable), fall back to title
      const searchQuery: any = {};

      // Add language (use first language or default to English)
      const language = params.languages && params.languages.length > 0 
        ? this.convertTo3LetterCode(params.languages[0])
        : 'eng';
      searchQuery.sublanguageid = language;

      if (params.imdbId) {
        // IMDB ID gives exact match - don't include query/title as it can override
        searchQuery.imdbid = params.imdbId.replace(/^tt/, '');
        console.log('[OpenSubtitles] Searching by IMDB ID:', searchQuery.imdbid);
      } else if (params.title) {
        // Fall back to title search
        searchQuery.query = params.title;
        console.log('[OpenSubtitles] Searching by title:', params.title);
      }

      // Add season/episode for TV shows
      if (params.season !== undefined) {
        searchQuery.season = params.season.toString();
      }
      if (params.episode !== undefined) {
        searchQuery.episode = params.episode.toString();
      }

      console.log('[OpenSubtitles] Search query:', JSON.stringify(searchQuery));

      const response = await this.xmlrpcCall('SearchSubtitles', [
        token,
        [searchQuery],
      ]);

      if (response.status !== '200 OK') {
        throw new Error(`Search failed: ${response.status}`);
      }

      // Check if we got results - handle both null/undefined and empty array
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        console.log('[OpenSubtitles] No results found. data:', JSON.stringify(response.data));
        return [];
      }

      console.log('[OpenSubtitles] Found', response.data.length, 'results');
      console.log('[OpenSubtitles] First result sample:', JSON.stringify(response.data[0]).substring(0, 500));

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
    
    // Find the top-level struct inside <params><param><value><struct>...</struct></value></param></params>
    const structStart = xml.indexOf('<struct>');
    const structEnd = xml.lastIndexOf('</struct>');
    if (structStart === -1 || structEnd === -1) {
      return result;
    }
    
    const structXML = xml.substring(structStart, structEnd + '</struct>'.length);
    const parsed = this.parseXMLValue(structXML);
    
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      Object.assign(result, parsed);
    }

    return result;
  }

  /**
   * Extract content between balanced XML tags
   */
  private extractBalanced(xml: string, openTag: string, closeTag: string): string | null {
    const startIdx = xml.indexOf(openTag);
    if (startIdx === -1) return null;
    
    let depth = 0;
    let i = startIdx;
    const contentStart = startIdx + openTag.length;
    
    while (i < xml.length) {
      if (xml.substring(i, i + openTag.length) === openTag) {
        depth++;
        i += openTag.length;
      } else if (xml.substring(i, i + closeTag.length) === closeTag) {
        depth--;
        if (depth === 0) {
          return xml.substring(contentStart, i);
        }
        i += closeTag.length;
      } else {
        i++;
      }
    }
    return null;
  }

  /**
   * Parse XML value - handles nested structures properly
   */
  private parseXMLValue(xml: string): any {
    const trimmed = xml.trim();
    
    // String
    const stringMatch = trimmed.match(/^<string>([\s\S]*)<\/string>$/);
    if (stringMatch) {
      return stringMatch[1];
    }

    // Int / i4
    const intMatch = trimmed.match(/^<(?:int|i4)>([^<]+)<\/(?:int|i4)>$/);
    if (intMatch && intMatch[1]) {
      return parseInt(intMatch[1], 10);
    }

    // Double
    const doubleMatch = trimmed.match(/^<double>([^<]+)<\/double>$/);
    if (doubleMatch && doubleMatch[1]) {
      return parseFloat(doubleMatch[1]);
    }

    // Boolean
    const boolMatch = trimmed.match(/^<boolean>([^<]+)<\/boolean>$/);
    if (boolMatch) {
      return boolMatch[1] === '1';
    }

    // Struct
    if (trimmed.startsWith('<struct>')) {
      const struct: any = {};
      const inner = this.extractBalanced(trimmed, '<struct>', '</struct>');
      if (!inner) return struct;
      
      // Find all <member>...</member> blocks using balanced extraction
      let searchFrom = 0;
      while (searchFrom < inner.length) {
        const memberStart = inner.indexOf('<member>', searchFrom);
        if (memberStart === -1) break;
        
        const memberContent = this.extractBalanced(inner.substring(memberStart), '<member>', '</member>');
        if (!memberContent) break;
        
        // Extract name
        const nameMatch = memberContent.match(/<name>([^<]+)<\/name>/);
        if (!nameMatch || !nameMatch[1]) {
          searchFrom = memberStart + 1;
          continue;
        }
        const name = nameMatch[1];
        
        // Extract value content (between <value> and </value>)
        const valueContent = this.extractBalanced(memberContent, '<value>', '</value>');
        if (valueContent) {
          struct[name] = this.parseXMLValue(valueContent.trim());
        }
        
        searchFrom = memberStart + memberContent.length + '<member>'.length + '</member>'.length;
      }
      
      return struct;
    }

    // Array
    if (trimmed.startsWith('<array>')) {
      const result: any[] = [];
      const inner = this.extractBalanced(trimmed, '<array>', '</array>');
      if (!inner) return result;
      
      const dataContent = this.extractBalanced(inner, '<data>', '</data>');
      if (!dataContent) return result;
      
      // Find all <value>...</value> blocks using balanced extraction
      let searchFrom = 0;
      while (searchFrom < dataContent.length) {
        const valueStart = dataContent.indexOf('<value>', searchFrom);
        if (valueStart === -1) break;
        
        const valueContent = this.extractBalanced(dataContent.substring(valueStart), '<value>', '</value>');
        if (!valueContent) break;
        
        result.push(this.parseXMLValue(valueContent.trim()));
        searchFrom = valueStart + valueContent.length + '<value>'.length + '</value>'.length;
      }
      
      return result;
    }

    // Try to extract from wrapper
    if (trimmed.startsWith('<value>')) {
      const inner = this.extractBalanced(trimmed, '<value>', '</value>');
      if (inner) {
        return this.parseXMLValue(inner.trim());
      }
    }

    return null;
  }

  /**
   * Parse XML array (delegates to parseXMLValue)
   */
  private parseXMLArray(xml: string): any[] {
    const dataContent = this.extractBalanced(xml, '<data>', '</data>');
    if (!dataContent) return [];
    const result = this.parseXMLValue(`<array><data>${dataContent}</data></array>`);
    return Array.isArray(result) ? result : [];
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
export function createOpenSubtitlesProvider(config?: {
  apiKey?: string;
  username?: string;
  password?: string;
}): OpenSubtitlesProvider {
  return new OpenSubtitlesProvider({
    apiKey: config?.apiKey,
    username: config?.username,
    password: config?.password,
  });
}
