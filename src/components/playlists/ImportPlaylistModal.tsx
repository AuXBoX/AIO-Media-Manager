import { useState, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { createPlexClient } from '@/api/plexClient';
import { PlaylistManager, type LibraryTrack } from '@/managers/PlaylistManager';

interface ImportPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (name: string, tracks: LibraryTrack[]) => void;
}

interface ParsedTrack {
  title: string;
  artist: string;
  album?: string;
}

interface MatchedTrack extends ParsedTrack {
  matched: LibraryTrack | null;
  status: 'matched' | 'not-found' | 'pending';
}

export function ImportPlaylistModal({ isOpen, onClose, onImport }: ImportPlaylistModalProps) {
  const { serverConnection, currentToken, selectedLibrary } = useAppStore();
  const [step, setStep] = useState<'input' | 'parsing' | 'matching' | 'results'>('input');
  const [playlistName, setPlaylistName] = useState('');
  const [importSource, setImportSource] = useState<'csv' | 'text' | 'spotify'>('csv');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [parsedTracks, setParsedTracks] = useState<MatchedTrack[]>([]);
  const [matchProgress, setMatchProgress] = useState({ current: 0, total: 0, matched: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsv = (content: string): ParsedTrack[] => {
    const lines = content.split('\n').filter(l => l.trim());
    if (lines.length === 0) return [];

    // Try to detect header
    const firstLine = lines[0]?.toLowerCase() ?? '';
    const hasHeader = firstLine.includes('title') || firstLine.includes('artist') || firstLine.includes('track');
    const startIdx = hasHeader ? 1 : 0;

    const tracks: ParsedTrack[] = [];
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        const [first, second, third] = parts;
        tracks.push({
          title: second || first || '',
          artist: first || '',
          album: third,
        });
      }
    }
    return tracks;
  };

  const parseText = (content: string): ParsedTrack[] => {
    const lines = content.split('\n').filter(l => l.trim());
    const tracks: ParsedTrack[] = [];

    for (const line of lines) {
      // Try common formats:
      // "Artist - Title"
      // "Title - Artist"
      // "Title" (just title)
      const parts = line.split(' - ').map(p => p.trim());
      if (parts.length >= 2) {
        tracks.push({
          artist: parts[0] || '',
          title: parts[1] || '',
        });
      } else if (parts[0]) {
        tracks.push({
          artist: '',
          title: parts[0],
        });
      }
    }
    return tracks;
  };

  const handleFileSelect = async (file: File) => {
    try {
      setStep('parsing');
      const content = await file.text();
      
      // Auto-detect playlist name from filename
      if (!playlistName) {
        setPlaylistName(file.name.replace(/\.[^.]+$/, ''));
      }

      const parsed = file.name.endsWith('.csv') ? parseCsv(content) : parseText(content);
      const matched: MatchedTrack[] = parsed.map(t => ({ ...t, matched: null, status: 'pending' }));
      setParsedTracks(matched);
      
      if (matched.length > 0) {
        await matchTracks(matched);
      } else {
        setStep('input');
        alert('No tracks found in file. Please check the format.');
      }
    } catch (error) {
      console.error('Parse failed:', error);
      setStep('input');
      alert('Failed to parse file');
    }
  };

  const matchTracks = async (tracks: MatchedTrack[]) => {
    if (!serverConnection || !currentToken || !selectedLibrary) return;

    setStep('matching');
    setMatchProgress({ current: 0, total: tracks.length, matched: 0 });

    const manager = new PlaylistManager(createPlexClient({
      baseURL: serverConnection.uri,
      token: currentToken,
    }));

    const updated = [...tracks];
    let matchedCount = 0;

    for (let i = 0; i < updated.length; i++) {
      const track = updated[i];
      if (!track) continue;
      
      setMatchProgress({ current: i + 1, total: tracks.length, matched: matchedCount });

      try {
        // Search by title first
        const results = await manager.searchLibraryTracks(selectedLibrary.key, track.title);
        
        if (results.length > 0) {
          // Try to find best match by artist
          const bestMatch = results.find(r => 
            r.artist.toLowerCase().includes(track.artist.toLowerCase()) ||
            track.artist.toLowerCase().includes(r.artist.toLowerCase())
          );
          
          if (bestMatch) {
            track.matched = bestMatch;
            track.status = 'matched';
            matchedCount++;
          } else if (results.length > 0 && results[0]) {
            // Use first result as fallback
            track.matched = results[0];
            track.status = 'matched';
            matchedCount++;
          }
        } else {
          track.status = 'not-found';
        }
      } catch (error) {
        console.error(`Failed to match track ${track.title}:`, error);
        track.status = 'not-found';
      }

      updated[i] = { ...track };
    }

    setParsedTracks([...updated]);
    setMatchProgress({ current: tracks.length, total: tracks.length, matched: matchedCount });
    setStep('results');
  };

  const handleImport = () => {
    const matchedTracks = parsedTracks
      .filter(t => t.status === 'matched' && t.matched)
      .map(t => t.matched!);
    
    if (matchedTracks.length === 0) {
      alert('No matched tracks to import');
      return;
    }

    onImport(playlistName || 'Imported Playlist', matchedTracks);
    resetState();
  };

  const resetState = () => {
    setStep('input');
    setPlaylistName('');
    setParsedTracks([]);
    setMatchProgress({ current: 0, total: 0, matched: 0 });
    setSpotifyUrl('');
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetState}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Playlist</h2>
            <button
              onClick={resetState}
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
          {step === 'input' && (
            <div className="space-y-6">
              {/* Playlist name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Playlist Name
                </label>
                <input
                  type="text"
                  value={playlistName}
                  onChange={e => setPlaylistName(e.target.value)}
                  placeholder="My Imported Playlist"
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Import source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Import From
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setImportSource('csv')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      importSource === 'csv'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CSV File</span>
                  </button>
                  <button
                    onClick={() => setImportSource('text')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      importSource === 'text'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Text File</span>
                  </button>
                  <button
                    onClick={() => setImportSource('spotify')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      importSource === 'spotify'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <svg className="w-8 h-8 mx-auto mb-2 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Spotify</span>
                  </button>
                </div>
              </div>

              {/* File upload or URL input */}
              {(importSource === 'csv' || importSource === 'text') ? (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-blue-500">Click to upload</span> your {importSource.toUpperCase()} file
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      {importSource === 'csv' 
                        ? 'Format: Title, Artist (one per line)' 
                        : 'Format: Artist - Title (one per line)'}
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={importSource === 'csv' ? '.csv' : '.txt,.m3u,.m3u8'}
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Spotify Playlist URL
                  </label>
                  <input
                    type="text"
                    value={spotifyUrl}
                    onChange={e => setSpotifyUrl(e.target.value)}
                    placeholder="https://open.spotify.com/playlist/..."
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Note: Spotify import requires API configuration in Settings
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Parsing file...</p>
            </div>
          )}

          {step === 'matching' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Matching tracks... ({matchProgress.current}/{matchProgress.total})
              </p>
              <div className="w-full max-w-xs mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${(matchProgress.current / matchProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Found {matchProgress.matched} matches
              </p>
            </div>
          )}

          {step === 'results' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {matchProgress.matched} matched
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {matchProgress.total - matchProgress.matched} not found
                  </p>
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  {Math.round((matchProgress.matched / matchProgress.total) * 100)}%
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1">
                {parsedTracks.map((track, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      track.status === 'matched'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      track.status === 'matched' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {track.status === 'matched' ? (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {track.artist}
                        {track.matched && ` → ${track.matched.artist}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'results' && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button
              onClick={resetState}
              className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={matchProgress.matched === 0}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors"
            >
              Import {matchProgress.matched} Tracks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
