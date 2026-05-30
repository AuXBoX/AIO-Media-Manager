import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { createPlexClient } from '@/api/plexClient';
import { PlaylistManager } from '@/managers/PlaylistManager';
import type { AudioTrack } from '@/components/audio/AudioPlayer';

interface MissingTracksPanelProps {
  isOpen: boolean;
  onClose: () => void;
  playlistTracks: AudioTrack[];
  playlistName?: string;
}

interface MissingTrack {
  track: AudioTrack;
  reason: 'not-in-library' | 'no-stream' | 'low-quality';
  details?: string;
}

export function MissingTracksPanel({ isOpen, onClose, playlistTracks, playlistName }: MissingTracksPanelProps) {
  const { serverConnection, currentToken, selectedLibrary } = useAppStore();
  const [missingTracks, setMissingTracks] = useState<MissingTrack[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manager, setManager] = useState<PlaylistManager | null>(null);

  useEffect(() => {
    if (serverConnection && currentToken) {
      const client = createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      });
      setManager(new PlaylistManager(client));
    }
  }, [serverConnection, currentToken]);

  // Scan for missing tracks
  const scanMissingTracks = async () => {
    if (!manager || !selectedLibrary) return;

    setScanning(true);
    const missing: MissingTrack[] = [];

    for (const track of playlistTracks) {
      // Check if track has no stream URL (file not available)
      if (!track.streamUrl) {
        missing.push({
          track,
          reason: 'no-stream',
          details: 'Audio file not available',
        });
        continue;
      }

      // Try to verify track exists in library
      try {
        const results = await manager.searchLibraryTracks(selectedLibrary.key, track.title || '');
        const found = results.some(r => r.ratingKey === track.ratingKey);
        
        if (!found) {
          missing.push({
            track,
            reason: 'not-in-library',
            details: 'Track not found in current library section',
          });
        }
      } catch (error) {
        // If search fails, skip this track
        console.error(`Failed to verify track ${track.title}:`, error);
      }
    }

    setMissingTracks(missing);
    setScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      scanMissingTracks();
    }
  }, [isOpen, manager, selectedLibrary]);

  // Export missing tracks to CSV
  const exportToCsv = () => {
    const headers = ['Title', 'Artist', 'Album', 'Reason', 'Details'];
    const rows = missingTracks.map(m => [
      m.track.title || '',
      m.track.artist || '',
      m.track.album || '',
      m.reason,
      m.details || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missing-tracks-${playlistName || 'playlist'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const text = missingTracks
      .map(m => `${m.track.artist} - ${m.track.title} (${m.reason})`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  const getReasonLabel = (reason: MissingTrack['reason']) => {
    switch (reason) {
      case 'not-in-library':
        return 'Not in Library';
      case 'no-stream':
        return 'File Missing';
      case 'low-quality':
        return 'Low Quality';
      default:
        return reason;
    }
  };

  const getReasonColor = (reason: MissingTrack['reason']) => {
    switch (reason) {
      case 'not-in-library':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'no-stream':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'low-quality':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Missing Tracks</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {playlistName ? `"${playlistName}" • Tracks that need attention` : 'Tracks that need attention'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {scanning ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Scanning playlist...</p>
            </div>
          ) : missingTracks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium text-gray-900 dark:text-white">No missing tracks!</p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                All tracks in this playlist are available in your library.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {missingTracks.length} missing {missingTracks.length === 1 ? 'track' : 'tracks'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    These tracks need attention
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={exportToCsv}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Track list */}
              <div className="space-y-2">
                {missingTracks.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {item.track.title}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {item.track.artist} • {item.track.album}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getReasonColor(item.reason)}`}>
                      {getReasonLabel(item.reason)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
