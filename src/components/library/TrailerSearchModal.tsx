import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { createProviderRegistry } from '@/providers/ProviderRegistry';
import { createPlexClient } from '@/api/plexClient';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { YouTubeTrailer } from '@/types/youtube';

interface TrailerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieTitle: string;
  movieYear?: number;
  mediaFilePath: string;
  onTrailerDownloaded: () => void;
}

export function TrailerSearchModal({
  isOpen,
  onClose,
  movieTitle,
  movieYear,
  mediaFilePath,
  onTrailerDownloaded,
}: TrailerSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState(`${movieTitle} ${movieYear || ''} trailer`);
  const [trailers, setTrailers] = useState<YouTubeTrailer[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<'2160p' | '1440p' | '1080p' | '720p' | '480p' | '360p' | '240p' | '144p'>('1080p');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [perTrailerQuality, setPerTrailerQuality] = useState<Record<string, string>>({});
  
  const { serverConnection, currentToken } = useAppStore();

  // Create Plex client and provider registry
  const client = createPlexClient({
    baseURL: serverConnection?.uri || '',
    token: currentToken || '',
  });
  
  const providerRegistry = createProviderRegistry(client, {
    youtube: {
      enabled: true,
    },
  });
  
  const youtubeProvider = providerRegistry.getYouTubeProvider();

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!youtubeProvider) {
        throw new Error('YouTube provider not available');
      }
      
      const results = await youtubeProvider.searchTrailers({
        query: searchQuery,
        year: movieYear,
        maxResults: 20,
        preferredResolution: selectedQuality,
      });
      return results;
    },
    onSuccess: (results) => {
      setTrailers(results);
      // Initialize per-trailer quality selections with the best available quality for each
      const initialQualities: Record<string, string> = {};
      results.forEach((trailer) => {
        // Set to the highest available quality
        if (trailer.availableQualities && trailer.availableQualities.length > 0) {
          initialQualities[trailer.id] = trailer.availableQualities[0]!;
        } else {
          initialQualities[trailer.id] = '720p'; // Default fallback
        }
      });
      setPerTrailerQuality(initialQualities);
    },
  });

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: async ({ trailer, replace }: { trailer: YouTubeTrailer; replace: boolean }) => {
      if (!window.electron?.downloadYouTubeVideo) {
        throw new Error('YouTube download not available');
      }

      // Validate mediaFilePath
      if (!mediaFilePath || typeof mediaFilePath !== 'string') {
        throw new Error('Media file path is not available. Cannot determine download location.');
      }

      setDownloadingId(trailer.id);

      // Determine if mediaFilePath is a directory or file path
      const lastSlash = Math.max(mediaFilePath.lastIndexOf('/'), mediaFilePath.lastIndexOf('\\'));
      const lastDot = mediaFilePath.lastIndexOf('.');
      const pathSeparator = mediaFilePath.includes('\\') ? '\\' : '/';
      
      let mediaDir: string;
      let mediaBaseName: string;
      
      // Check if this is a directory path (no extension after last slash) or file path
      if (lastDot === -1 || lastDot < lastSlash) {
        // Directory path (TV shows/seasons)
        mediaDir = mediaFilePath;
        mediaBaseName = movieTitle; // Use the title as base name
      } else {
        // File path (movies/episodes)
        mediaDir = mediaFilePath.substring(0, lastSlash);
        mediaBaseName = mediaFilePath.substring(lastSlash + 1, lastDot);
      }
      
      // If replacing, use the base name. If adding, append a number
      let outputFileName = `${mediaBaseName}-trailer.mp4`;
      if (!replace) {
        // Find next available number
        let counter = 1;
        while (true) {
          try {
            await window.electron.getFileStats(`${mediaDir}${pathSeparator}${outputFileName}`);
            // File exists, try next number
            outputFileName = `${mediaBaseName}-trailer-${counter}.mp4`;
            counter++;
          } catch {
            // File doesn't exist, use this name
            break;
          }
        }
      }
      
      const outputPath = `${mediaDir}${pathSeparator}${outputFileName}`;

      // Get the selected quality for this specific trailer
      const quality = perTrailerQuality[trailer.id] || '1080p';

      // Download trailer
      await window.electron.downloadYouTubeVideo(trailer.url, outputPath, quality);

      return { path: outputPath, fileName: outputFileName };
    },
    onSuccess: () => {
      setDownloadingId(null);
      onTrailerDownloaded();
      onClose();
    },
    onError: (error) => {
      setDownloadingId(null);
      console.error('Failed to download trailer:', error);
      
      // Check if it's a yt-dlp not found error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('yt-dlp not found')) {
        alert(
          'yt-dlp is required to download YouTube videos.\n\n' +
          'Please install yt-dlp:\n' +
          '1. Download from: https://github.com/yt-dlp/yt-dlp/releases\n' +
          '2. Add to your system PATH\n' +
          '3. Restart the application\n\n' +
          'Or install via package manager:\n' +
          '- Windows: winget install yt-dlp\n' +
          '- macOS: brew install yt-dlp\n' +
          '- Linux: sudo apt install yt-dlp'
        );
      } else if (errorMessage.includes('This video is not available') || errorMessage.includes('Video unavailable')) {
        alert(
          'This video is not available.\n\n' +
          'This can happen because:\n' +
          '- The video was deleted or made private\n' +
          '- Regional restrictions\n' +
          '- Age-restricted content\n\n' +
          'Please try selecting a different trailer from the list.'
        );
      } else if (errorMessage.includes('HTTP 403') || errorMessage.includes('Sign in to confirm')) {
        alert(
          'YouTube blocked the download.\n\n' +
          'This can happen due to:\n' +
          '- Regional restrictions\n' +
          '- Age-restricted content\n' +
          '- YouTube anti-bot measures\n\n' +
          'Try:\n' +
          '1. Updating yt-dlp to the latest version\n' +
          '2. Selecting a different trailer\n' +
          '3. Using the Preview button to watch in browser instead'
        );
      } else {
        // Generic error - show a user-friendly message
        alert(
          'Failed to download trailer.\n\n' +
          'The video may be unavailable, region-locked, or age-restricted.\n\n' +
          'Please try selecting a different trailer from the list.'
        );
      }
    },
  });

  const handleSearch = () => {
    searchMutation.mutate();
  };

  const handleDownload = (trailer: YouTubeTrailer, replace: boolean) => {
    if (replace) {
      const confirmed = confirm('This will replace the existing trailer. Continue?');
      if (!confirmed) return;
    }
    downloadMutation.mutate({ trailer, replace });
  };

  const handlePreview = (trailer: YouTubeTrailer) => {
    if (window.electron?.openFile) {
      // Open YouTube URL in default browser
      window.open(trailer.url, '_blank');
    }
  };

  // Filter trailers by selected quality
  const filteredTrailers = trailers.filter((trailer) => {
    if (!trailer.availableQualities || trailer.availableQualities.length === 0) {
      return true; // Show trailers with unknown qualities
    }
    // Check if the trailer has the selected quality or better
    const qualityOrder = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'];
    const selectedIndex = qualityOrder.indexOf(selectedQuality);
    return trailer.availableQualities.some((q) => {
      const qIndex = qualityOrder.indexOf(q);
      return qIndex !== -1 && qIndex <= selectedIndex;
    });
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Search Trailers
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                {movieTitle} {movieYear && `(${movieYear})`}
              </p>
            </div>
            <Button
              variant="icon"
              onClick={onClose}
              aria-label="Close"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Search Form */}
        <div className="px-6 py-4 border-b border-border bg-background-secondary">
          <div className="flex gap-3">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for trailers..."
              className="flex-1"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value as any)}
              className="px-4 py-2.5 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-3 focus:ring-primary-subtle focus:border-primary-500 transition-all"
            >
              <option value="2160p">4K (2160p)</option>
              <option value="1440p">2K (1440p)</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
              <option value="360p">360p</option>
              <option value="240p">240p</option>
              <option value="144p">144p</option>
            </select>
            <Button
              variant="primary"
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              loading={searchMutation.isPending}
            >
              Search
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {searchMutation.isPending && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
          )}

          {searchMutation.isError && (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-3 px-4 py-3 bg-error-50 border border-error-200 rounded-xl text-error-800">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">
                  Failed to search trailers: {searchMutation.error instanceof Error ? searchMutation.error.message : 'Unknown error'}
                </p>
              </div>
            </div>
          )}

          {trailers.length === 0 && !searchMutation.isPending && !searchMutation.isError && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-text-secondary">
                No trailers found. Try searching with different keywords.
              </p>
            </div>
          )}

          {filteredTrailers.length === 0 && trailers.length > 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-3 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-text-secondary">
                No trailers available in {selectedQuality} or higher quality.
              </p>
              <p className="text-sm text-text-tertiary mt-2">
                Try selecting a lower quality filter.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {filteredTrailers.map((trailer) => (
              <div
                key={trailer.id}
                className="flex gap-4 p-4 border border-border rounded-xl hover:bg-background-secondary transition-colors"
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={trailer.thumbnail}
                    alt={trailer.title}
                    className="w-40 h-24 object-cover rounded-lg"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-text-primary truncate">
                    {trailer.title}
                  </h3>
                  <p className="text-sm text-text-secondary mt-1">
                    {trailer.channelName}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                    <span>{trailer.duration}</span>
                    <span>{trailer.viewCount?.toLocaleString()} views</span>
                    {trailer.isOfficial && (
                      <span className="px-2 py-0.5 bg-primary-subtle text-primary-500 rounded font-medium">
                        Official
                      </span>
                    )}
                  </div>
                  {/* Available Qualities */}
                  {trailer.availableQualities && trailer.availableQualities.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-text-tertiary">Available:</span>
                      <div className="flex gap-1">
                        {trailer.availableQualities.map((quality) => (
                          <span
                            key={quality}
                            className="px-2 py-0.5 text-xs bg-background-secondary text-text-secondary rounded border border-border"
                          >
                            {quality}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {/* Quality selector for this trailer */}
                  {trailer.availableQualities && trailer.availableQualities.length > 0 && (
                    <select
                      value={perTrailerQuality[trailer.id] || trailer.availableQualities[0]}
                      onChange={(e) => setPerTrailerQuality({ ...perTrailerQuality, [trailer.id]: e.target.value })}
                      className="px-3 py-1.5 text-sm border border-border rounded-lg bg-white text-text-primary focus:outline-none focus:ring-3 focus:ring-primary-subtle focus:border-primary-500 transition-all"
                    >
                      {trailer.availableQualities.map((quality) => (
                        <option key={quality} value={quality}>
                          {quality}
                        </option>
                      ))}
                    </select>
                  )}
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handlePreview(trailer)}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  >
                    Preview
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleDownload(trailer, true)}
                    disabled={downloadingId === trailer.id}
                    loading={downloadingId === trailer.id}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    }
                  >
                    Replace
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => handleDownload(trailer, false)}
                    disabled={downloadingId === trailer.id}
                    loading={downloadingId === trailer.id}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    }
                  >
                    Add New
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
