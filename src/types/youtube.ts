/**
 * YouTube Trailer Search Result
 */
export interface YouTubeTrailer {
  id: string;
  title: string;
  channelName: string;
  channelId: string;
  thumbnail: string;
  duration: string;
  publishedAt: string;
  viewCount: number;
  url: string;
  isOfficial: boolean;
  isStudioChannel: boolean;
  score: number; // Relevance score based on filters
  availableQualities: string[]; // e.g., ['1080p', '720p', '480p', '360p']
}

/**
 * YouTube Trailer Search Options
 */
export interface TrailerSearchOptions {
  query: string;
  year?: number;
  maxResults?: number;
  preferredResolution?: '2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p';
  prioritizeOfficial?: boolean;
  prioritizeStudioChannels?: boolean;
}
