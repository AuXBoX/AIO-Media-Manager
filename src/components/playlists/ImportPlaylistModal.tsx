import { useState, useRef, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { createPlexClient } from '@/api/plexClient';
import { PlaylistManager, type LibraryTrack } from '@/managers/PlaylistManager';
import { detectRegion, getPopularPlaylists, getCharts, type ChartItem } from '@/utils/chartData';

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
  const [importSource, setImportSource] = useState<'csv' | 'text' | 'deezer' | 'billboard' | 'lastfm' | 'youtube' | 'aria'>('csv');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [parsedTracks, setParsedTracks] = useState<MatchedTrack[]>([]);
  const [matchProgress, setMatchProgress] = useState({ current: 0, total: 0, matched: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Detect user's region and get suggestions
  const region = useMemo(() => detectRegion(), []);
  const suggestions = useMemo(() => {
    if (importSource === 'aria' || importSource === 'billboard') {
      return getCharts(importSource);
    }
    return getPopularPlaylists(importSource, region.code);
  }, [importSource, region.code]);

  const sourceOptions = [
    { id: 'csv' as const, label: 'CSV File', icon: 'file', color: 'green' },
    { id: 'text' as const, label: 'Text File', icon: 'text', color: 'blue' },
    { id: 'deezer' as const, label: 'Deezer', icon: 'deezer', color: 'purple' },
    { id: 'billboard' as const, label: 'Billboard', icon: 'chart', color: 'red' },
    { id: 'lastfm' as const, label: 'Last.fm', icon: 'lastfm', color: 'red' },
    { id: 'youtube' as const, label: 'YT Music', icon: 'youtube', color: 'red' },
    { id: 'aria' as const, label: 'ARIA Charts', icon: 'chart', color: 'gold' },
  ];

  const getSourceLabel = (source: string): string => {
    const labels: Record<string, string> = {
      csv: 'CSV File', text: 'Text File', deezer: 'Deezer', billboard: 'Billboard',
      lastfm: 'Last.fm', youtube: 'YouTube Music', aria: 'ARIA Charts',
    };
    return labels[source] || source;
  };

  const getSourcePlaceholder = (source: string): string => {
    const placeholders: Record<string, string> = {
      deezer: 'https://www.deezer.com/playlist/...',
      billboard: 'https://www.billboard.com/charts/...',
      lastfm: 'https://www.last.fm/user/.../playlists/...',
      youtube: 'https://music.youtube.com/playlist?list=...',
      aria: 'https://www.ariacharts.com.au/chart/...',
    };
    return placeholders[source] || 'Enter playlist URL...';
  };

  const SourceIcon = ({ type, color }: { type: string; color: string }) => {
    const colorClass = {
      green: 'text-green-500', blue: 'text-primary-500', purple: 'text-purple-500',
      red: 'text-red-500', gold: 'text-yellow-500',
    }[color] || 'text-gray-500';

    const icons: Record<string, React.ReactNode> = {
      file: (
        <svg className={`w-6 h-6 mx-auto ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      text: (
        <svg className={`w-6 h-6 mx-auto ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
        </svg>
      ),
      deezer: (
        <svg className={`w-6 h-6 mx-auto ${colorClass}`} viewBox="0 0 24 24" fill="currentColor">
          <rect x="2" y="18" width="4" height="3"/>
          <rect x="7" y="14" width="4" height="7"/>
          <rect x="12" y="10" width="4" height="11"/>
          <rect x="17" y="6" width="4" height="15"/>
        </svg>
      ),
      chart: (
        <svg className={`w-6 h-6 mx-auto ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      lastfm: (
        <svg className={`w-6 h-6 mx-auto ${colorClass}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.5 5.5c-2.5 0-4.5 2-4.5 4.5s2 4.5 4.5 4.5h3c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5h-3c-4.1 0-7.5-3.4-7.5-7.5S6.4 2.5 10.5 2.5h3c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5h-3zm3 4c2.5 0 4.5 2 4.5 4.5s-2 4.5-4.5 4.5h-3c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5h3c.8 0 1.5-.7 1.5-1.5s-.7-1.5-1.5-1.5h-3c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5h3c4.1 0 7.5 3.4 7.5 7.5s-3.4 7.5-7.5 7.5h-3c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5h3z"/>
        </svg>
      ),
      youtube: (
        <svg className={`w-6 h-6 mx-auto ${colorClass}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
        </svg>
      ),
    };

    return <>{icons[type] || icons['chart']}</>;
  };

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
        // Use artist-first search strategy
        const query = track.artist ? `${track.artist} - ${track.title}` : track.title;
        const results = await manager.searchLibraryTracks(
          selectedLibrary.key, 
          query,
          track.artist,
          track.title
        );
        
        if (results.length > 0) {
          // Find best match with scoring
          const cleanArtist = track.artist.toLowerCase().trim();
          const cleanTitle = track.title.toLowerCase().trim();
          
          let bestMatch = null;
          let bestScore = 0;
          
          for (const r of results) {
            const rArtist = r.artist.toLowerCase().trim();
            const rTitle = r.title.toLowerCase().trim();
            
            // Calculate match score
            let score = 0;
            
            // Title match
            if (rTitle === cleanTitle) {
              score += 70;
            } else if (rTitle.includes(cleanTitle) || cleanTitle.includes(rTitle)) {
              score += 60;
            }
            
            // Artist match
            if (rArtist === cleanArtist) {
              score += 30;
            } else if (rArtist.includes(cleanArtist) || cleanArtist.includes(rArtist)) {
              score += 25;
            }
            
            // Penalize Various Artists
            const isVarious = rArtist.includes('various') || rArtist.includes('compilation');
            if (isVarious && rArtist !== cleanArtist) {
              score -= 40;
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestMatch = r;
            }
          }
          
          // Only accept if score is reasonable
          if (bestMatch && bestScore >= 40) {
            track.matched = bestMatch;
            track.status = 'matched';
            matchedCount++;
          } else {
            track.status = 'not-found';
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
    setPlaylistUrl('');
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
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
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
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Import source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Import From
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {sourceOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setImportSource(opt.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        importSource === opt.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <SourceIcon type={opt.icon} color={opt.color} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1 block">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* File upload or URL input */}
              {(importSource === 'csv' || importSource === 'text') ? (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-primary-500">Click to upload</span> your {importSource.toUpperCase()} file
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
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {getSourceLabel(importSource)} URL
                      </label>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {region.flag} {region.name}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={playlistUrl}
                      onChange={e => setPlaylistUrl(e.target.value)}
                      placeholder={getSourcePlaceholder(importSource)}
                      className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Paste the playlist URL from {getSourceLabel(importSource)}
                    </p>
                  </div>

                  {/* Suggested playlists/charts */}
                  {suggestions.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {importSource === 'aria' || importSource === 'billboard' ? 'Available Charts' : 'Popular Playlists'}
                      </label>
                      <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                        {suggestions.map((item: ChartItem) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              setPlaylistUrl(item.url);
                              if (!playlistName) {
                                setPlaylistName(item.name);
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                              playlistUrl === item.url
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {item.name}
                              </p>
                              {item.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <svg className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Import button for URL sources */}
                  <button
                    onClick={async () => {
                      if (!playlistUrl.trim()) {
                        alert('Please enter a URL or select a chart');
                        return;
                      }
                      
                      // Check for Electron API
                      if (!(window as any).electron?.importPlaylistUrl) {
                        alert('URL import requires the desktop application. Please use the installed version.');
                        return;
                      }
                      
                      try {
                        setStep('parsing');
                        const name = playlistName || getSourceLabel(importSource) + ' Import';
                        
                        console.log('[Import] Fetching playlist from URL:', playlistUrl, 'source:', importSource);
                        const tracks = await (window as any).electron.importPlaylistUrl(playlistUrl, importSource);
                        
                        if (!tracks || tracks.length === 0) {
                          setStep('input');
                          alert(`No tracks found in the playlist.\n\nPossible causes:\n• The URL is invalid or points to a non-existent playlist\n• The playlist is private or region-restricted\n• The source website has changed its structure\n\nTry:\n• Double-check the URL works in your browser\n• Use a Deezer playlist URL (most reliable)\n• Paste a YouTube playlist URL for yt-dlp extraction`);
                          return;
                        }
                        
                        console.log(`[Import] Got ${tracks.length} tracks, starting match...`);
                        
                        const matched: MatchedTrack[] = tracks.map((t: { title: string; artist: string }) => ({
                          title: t.title,
                          artist: t.artist,
                          matched: null,
                          status: 'pending' as const,
                        }));
                        
                        setPlaylistName(name);
                        setParsedTracks(matched);
                        await matchTracks(matched);
                      } catch (error) {
                        console.error('[Import] Failed to fetch playlist:', error);
                        setStep('input');
                        alert(`Failed to import playlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      }
                    }}
                    className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Import Playlist
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'parsing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Fetching and parsing playlist...</p>
            </div>
          )}

          {step === 'matching' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Matching tracks... ({matchProgress.current}/{matchProgress.total})
              </p>
              <div className="w-full max-w-xs mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-500 h-2 rounded-full transition-all"
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
                <div className="text-2xl font-bold text-primary-500">
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
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors"
            >
              Import {matchProgress.matched} Tracks
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
