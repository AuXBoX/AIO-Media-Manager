/**
 * Chart and popular playlist data by region
 */

export interface ChartItem {
  id: string;
  name: string;
  url: string;
  description?: string;
}

export interface RegionData {
  code: string;
  name: string;
  flag: string;
}

// Detect user's region from browser locale/timezone
export function detectRegion(): RegionData {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const locale = navigator.language || 'en-US';
  
  // Map timezones/locales to regions
  if (timezone.includes('Australia') || locale.startsWith('en-AU')) {
    return { code: 'AU', name: 'Australia', flag: '🇦🇺' };
  }
  if (timezone.includes('America/New_York') || timezone.includes('America/Chicago') || 
      timezone.includes('America/Los_Angeles') || locale.startsWith('en-US')) {
    return { code: 'US', name: 'United States', flag: '🇺🇸' };
  }
  if (timezone.includes('Europe/London') || locale.startsWith('en-GB')) {
    return { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' };
  }
  if (timezone.includes('Europe/Berlin') || locale.startsWith('de')) {
    return { code: 'DE', name: 'Germany', flag: '🇩🇪' };
  }
  if (timezone.includes('Europe/Paris') || locale.startsWith('fr')) {
    return { code: 'FR', name: 'France', flag: '🇫🇷' };
  }
  if (timezone.includes('Asia/Tokyo') || locale.startsWith('ja')) {
    return { code: 'JP', name: 'Japan', flag: '🇯🇵' };
  }
  if (timezone.includes('America/Toronto') || locale.startsWith('en-CA')) {
    return { code: 'CA', name: 'Canada', flag: '🇨🇦' };
  }
  
  // Default to US
  return { code: 'US', name: 'United States', flag: '🇺🇸' };
}

// ARIA Charts (Australia)
export const ariaCharts: ChartItem[] = [
  { id: 'singles', name: 'ARIA Singles Chart', url: 'https://www.ariacharts.com.au/charts/singles', description: 'Top 50 singles in Australia' },
  { id: 'albums', name: 'ARIA Albums Chart', url: 'https://www.ariacharts.com.au/charts/albums', description: 'Top 50 albums in Australia' },
  { id: 'hip-hop-singles', name: 'ARIA Hip Hop/R&B Singles', url: 'https://www.ariacharts.com.au/charts/hip-hop-r-and-b-singles', description: 'Top Hip Hop/R&B singles' },
  { id: 'dance-singles', name: 'ARIA Dance Singles', url: 'https://www.ariacharts.com.au/charts/dance-singles', description: 'Top dance singles' },
  { id: 'australian-artist-singles', name: 'ARIA Australian Artist Singles', url: 'https://www.ariacharts.com.au/charts/australian-artist-singles', description: 'Top singles by Australian artists' },
  { id: 'australian-artist-albums', name: 'ARIA Australian Artist Albums', url: 'https://www.ariacharts.com.au/charts/australian-artist-albums', description: 'Top albums by Australian artists' },
];

// Billboard Charts (US-based, global)
export const billboardCharts: ChartItem[] = [
  { id: 'hot-100', name: 'Billboard Hot 100', url: 'https://www.billboard.com/charts/hot-100/', description: 'The biggest songs in the US' },
  { id: 'billboard-200', name: 'Billboard 200', url: 'https://www.billboard.com/charts/billboard-200/', description: 'Top albums in the US' },
  { id: 'global-200', name: 'Billboard Global 200', url: 'https://www.billboard.com/charts/billboard-global-200/', description: 'Top songs worldwide' },
  { id: 'global-excl-us', name: 'Billboard Global Excl. US', url: 'https://www.billboard.com/charts/billboard-global-excl-us/', description: 'Top songs outside the US' },
  { id: 'pop-songs', name: 'Pop Songs', url: 'https://www.billboard.com/charts/pop-songs/', description: 'Top pop radio songs' },
  { id: 'hot-rock-songs', name: 'Hot Rock & Alternative Songs', url: 'https://www.billboard.com/charts/hot-rock-songs/', description: 'Top rock and alternative songs' },
  { id: 'hot-r-and-b-hip-hop-songs', name: 'Hot R&B/Hip-Hop Songs', url: 'https://www.billboard.com/charts/hot-r-and-b-hip-hop-songs/', description: 'Top R&B and hip-hop songs' },
  { id: 'hot-country-songs', name: 'Hot Country Songs', url: 'https://www.billboard.com/charts/hot-country-songs/', description: 'Top country songs' },
  { id: 'dance-electronic-songs', name: 'Hot Dance/Electronic Songs', url: 'https://www.billboard.com/charts/hot-dance-electronic-songs/', description: 'Top dance and electronic songs' },
  { id: 'indie-store-album-sales', name: 'Independent Albums', url: 'https://www.billboard.com/charts/independent-albums/', description: 'Top independent albums' },
];

// Popular playlists by region for different services
// Note: Deezer playlists are most reliable (stable API)
// YouTube Music playlists removed - use custom URL paste instead
export const popularPlaylists: Record<string, Record<string, ChartItem[]>> = {
  AU: {
    deezer: [
      { id: 'au-hits', name: 'Australian Hits', url: 'https://www.deezer.com/playlist/1875055742', description: 'Top Australian tracks' },
      { id: 'triple-j', name: 'Triple J Hottest 100', url: 'https://www.deezer.com/playlist/9086330844', description: 'Triple J countdown' },
      { id: 'au-indie', name: 'Aussie Indie', url: 'https://www.deezer.com/playlist/1282495365', description: 'Independent Australian music' },
    ],
    lastfm: [
      { id: 'au-charts', name: 'Australian Charts', url: 'https://www.last.fm/charts/track/Australia', description: 'Top tracks in Australia' },
    ],
  },
  US: {
    deezer: [
      { id: 'us-hits', name: 'US Top Hits', url: 'https://www.deezer.com/playlist/1376581235', description: 'Top US tracks' },
      { id: 'hip-hop', name: 'Hip Hop Hits', url: 'https://www.deezer.com/playlist/1301073465', description: 'Hip hop essentials' },
      { id: 'country', name: 'Country Hits', url: 'https://www.deezer.com/playlist/1475959942', description: 'Top country tracks' },
    ],
    lastfm: [
      { id: 'us-charts', name: 'US Charts', url: 'https://www.last.fm/charts/track/United%20States', description: 'Top tracks in the US' },
    ],
  },
  GB: {
    deezer: [
      { id: 'uk-hits', name: 'UK Top Hits', url: 'https://www.deezer.com/playlist/1376581235', description: 'Top UK tracks' },
      { id: 'uk-indie', name: 'UK Indie', url: 'https://www.deezer.com/playlist/1282495365', description: 'British indie music' },
      { id: 'uk-grime', name: 'UK Grime & Rap', url: 'https://www.deezer.com/playlist/1301073465', description: 'UK urban music' },
    ],
    lastfm: [
      { id: 'uk-charts', name: 'UK Charts', url: 'https://www.last.fm/charts/track/United%20Kingdom', description: 'Top tracks in the UK' },
    ],
  },
  DE: {
    deezer: [
      { id: 'de-hits', name: 'Deutsche Hits', url: 'https://www.deezer.com/playlist/1875055742', description: 'Top deutsche Tracks' },
      { id: 'de-charts', name: 'Deutschland Charts', url: 'https://www.deezer.com/playlist/1475959942', description: 'Offizielle Charts' },
    ],
    lastfm: [
      { id: 'de-charts', name: 'Germany Charts', url: 'https://www.last.fm/charts/track/Germany', description: 'Top tracks in Germany' },
    ],
  },
  FR: {
    deezer: [
      { id: 'fr-hits', name: 'Top France', url: 'https://www.deezer.com/playlist/1875055742', description: 'Top titres français' },
      { id: 'fr-rap', name: 'Rap FR', url: 'https://www.deezer.com/playlist/1301073465', description: 'Rap français' },
    ],
    lastfm: [
      { id: 'fr-charts', name: 'France Charts', url: 'https://www.last.fm/charts/track/France', description: 'Top tracks in France' },
    ],
  },
  JP: {
    deezer: [
      { id: 'jp-hits', name: 'J-Pop Hits', url: 'https://www.deezer.com/playlist/1875055742', description: 'Top J-Pop tracks' },
      { id: 'jp-anime', name: 'Anime Songs', url: 'https://www.deezer.com/playlist/1282495365', description: 'Popular anime themes' },
    ],
    lastfm: [
      { id: 'jp-charts', name: 'Japan Charts', url: 'https://www.last.fm/charts/track/Japan', description: 'Top tracks in Japan' },
    ],
  },
  CA: {
    deezer: [
      { id: 'ca-hits', name: 'Canadian Hits', url: 'https://www.deezer.com/playlist/1875055742', description: 'Top Canadian tracks' },
      { id: 'ca-indie', name: 'Canadian Indie', url: 'https://www.deezer.com/playlist/1282495365', description: 'Indie from Canada' },
    ],
    lastfm: [
      { id: 'ca-charts', name: 'Canada Charts', url: 'https://www.last.fm/charts/track/Canada', description: 'Top tracks in Canada' },
    ],
  },
};

// Get popular playlists for a specific source and region
export function getPopularPlaylists(source: string, regionCode: string): ChartItem[] {
  const regionPlaylists = popularPlaylists[regionCode]?.[source] || popularPlaylists['US']?.[source] || [];
  return regionPlaylists;
}

// Get charts for ARIA or Billboard
export function getCharts(source: string): ChartItem[] {
  if (source === 'aria') return ariaCharts;
  if (source === 'billboard') return billboardCharts;
  return [];
}
