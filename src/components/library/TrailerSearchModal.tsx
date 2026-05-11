import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createProviderRegistry } from '@/providers/ProviderRegistry';
import { createPlexClient } from '@/api/plexClient';
import { useAppStore } from '@/store/appStore';
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
          initialQualities[trailer.id] = trailer.availableQualities[0];
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

      // Determine output path - handle both forward and backslashes
      const lastSlash = Math.max(mediaFilePath.lastIndexOf('/'), mediaFilePath.lastIndexOf('\\'));
      const lastDot = mediaFilePath.lastIndexOf('.');
      
      if (lastSlash === -1 || lastDot === -1 || lastDot < lastSlash) {
        throw new Error('Invalid media file path format');
      }
      
      const mediaDir = mediaFilePath.substring(0, lastSlash);
      const mediaBaseName = mediaFilePath.substring(lastSlash + 1, lastDot);
      
      // If replacing, use the base name. If adding, append a number
      const pathSeparator = mediaFilePath.includes('\\') ? '\\' : '/';
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
      } else if (errorMessage.includes('HTTP 403')) {
        alert(
          'YouTube blocked the download.\n\n' +
          'This can happen due to:\n' +
          '- Regional restrictions\n' +
          '- Age-restricted content\n' +
          '- YouTube anti-bot measures\n\n' +
          'Try:\n' +
          '1. Updating yt-dlp: pip install -U yt-dlp\n' +
          '2. Selecting a different trailer\n' +
          '3. Using the Preview button to watch in browser instead'
        );
      } else {
        alert(`Failed to download trailer:\n\n${errorMessage}`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Search Trailers
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {movieTitle} {movieYear && `(${movieYear})`}
          </p>
        </div>

        {/* Search Form */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for trailers..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <select
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <button
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {searchMutation.isPending ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {searchMutation.isPending && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {searchMutation.isError && (
            <div className="text-center py-12">
              <p className="text-red-500">
                Failed to search trailers: {searchMutation.error instanceof Error ? searchMutation.error.message : 'Unknown error'}
              </p>
            </div>
          )}

          {trailers.length === 0 && !searchMutation.isPending && !searchMutation.isError && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No trailers found. Try searching with different keywords.
              </p>
            </div>
          )}

          {filteredTrailers.length === 0 && trailers.length > 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No trailers available in {selectedQuality} or higher quality.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Try selecting a lower quality filter.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {filteredTrailers.map((trailer) => (
              <div
                key={trailer.id}
                className="flex gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                {/* Thumbnail */}
                <div className="flex-shrink-0">
                  <img
                    src={trailer.thumbnail}
                    alt={trailer.title}
                    className="w-40 h-24 object-cover rounded"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {trailer.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {trailer.channelName}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{trailer.duration}</span>
                    <span>{trailer.viewCount?.toLocaleString()} views</span>
                    {trailer.isOfficial && (
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        Official
                      </span>
                    )}
                  </div>
                  {/* Available Qualities */}
                  {trailer.availableQualities && trailer.availableQualities.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Available:</span>
                      <div className="flex gap-1">
                        {trailer.availableQualities.map((quality) => (
                          <span
                            key={quality}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600"
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
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {trailer.availableQualities.map((quality) => (
                        <option key={quality} value={quality}>
                          {quality}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => handlePreview(trailer)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Preview
                  </button>
                  <button
                    onClick={() => handleDownload(trailer, true)}
                    disabled={downloadingId === trailer.id}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {downloadingId === trailer.id ? 'Downloading...' : 'Replace'}
                  </button>
                  <button
                    onClick={() => handleDownload(trailer, false)}
                    disabled={downloadingId === trailer.id}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {downloadingId === trailer.id ? 'Downloading...' : 'Add New'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
