/**
 * SubtitleSearchModal
 * 
 * Modal for searching and downloading subtitles from SubDL and OpenSubtitles
 * Updated with modern Plex Pro design system
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import type { LibraryItem } from '@/managers/LibraryManager';
import type { SubtitleResult, SubtitleSearchParams } from '@/types/subtitle';
import { createSubDLProvider } from '@/providers/SubDLProvider';
import { createOpenSubtitlesProvider } from '@/providers/OpenSubtitlesProvider';

interface SubtitleSearchModalProps {
  item: LibraryItem;
  mediaFilePath: string;
  imdbId?: string;
  onClose: () => void;
  onSubtitleAdded: () => void;
}

export function SubtitleSearchModal({
  item,
  mediaFilePath,
  imdbId,
  onClose,
  onSubtitleAdded,
}: SubtitleSearchModalProps) {
  const [searchResults, setSearchResults] = useState<SubtitleResult[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [forcedOnly, setForcedOnly] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [subdlApiKey, setSubdlApiKey] = useState<string | null>(null);
  const [osCredentials, setOsCredentials] = useState<{ username: string; password: string } | null>(null);

  // Load API keys from settings
  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const { getSettingsManager } = await import('@/managers/SettingsManager');
        const settingsManager = getSettingsManager();
        const settings = await settingsManager.getSettings();
        
        setSubdlApiKey(settings.subdlApiKey || null);
        
        if (settings.opensubtitlesUsername && settings.opensubtitlesPassword) {
          setOsCredentials({
            username: settings.opensubtitlesUsername,
            password: settings.opensubtitlesPassword,
          });
        }
      } catch (error) {
        console.error('[SubtitleSearchModal] Error loading settings:', error);
      }
    };
    loadApiKeys();
  }, []);

  // Available languages
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'tr', name: 'Turkish' },
  ];

  const handleSearch = async () => {
    if (!subdlApiKey && !osCredentials) {
      setSearchError('No subtitle providers configured. Add SubDL API key or OpenSubtitles credentials in Settings > API Keys.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    // Build common search params
    const searchParams: SubtitleSearchParams = {
      title: item.title,
      year: item.year,
      languages: selectedLanguages,
      type: item.type === 'episode' ? 'episode' : 'movie',
    };

    // Add IMDB ID (from prop or item.guid)
    if (imdbId) {
      searchParams.imdbId = imdbId;
    } else if (item.guid) {
      const imdbMatch = item.guid.match(/imdb:\/\/tt(\d+)/);
      if (imdbMatch && imdbMatch[1]) {
        searchParams.imdbId = `tt${imdbMatch[1]}`;
      }
    }

    // Add TMDB ID if available
    if (item.guid) {
      const tmdbMatch = item.guid.match(/tmdb:\/\/(\d+)/);
      if (tmdbMatch && tmdbMatch[1]) {
        searchParams.tmdbId = parseInt(tmdbMatch[1], 10);
      }
    }

    // Add season/episode for TV shows
    if (item.type === 'episode') {
      searchParams.season = item.parentIndex;
      searchParams.episode = item.index;
    }

    try {
      // Search both providers in parallel
      const promises: Promise<SubtitleResult[]>[] = [];

      if (subdlApiKey) {
        const subdlProvider = createSubDLProvider(subdlApiKey);
        promises.push(
          subdlProvider.search(searchParams).catch(err => {
            console.error('[SubtitleSearchModal] SubDL search error:', err);
            return [];
          })
        );
      }

      if (osCredentials) {
        const osProvider = createOpenSubtitlesProvider(osCredentials);
        promises.push(
          osProvider.search(searchParams).catch(err => {
            console.error('[SubtitleSearchModal] OpenSubtitles search error:', err);
            return [];
          })
        );
      }

      const resultsArrays = await Promise.all(promises);
      let allResults = resultsArrays.flat();

      // Filter for forced subtitles if requested
      if (forcedOnly) {
        allResults = allResults.filter(sub => {
          const name = sub.releaseName.toLowerCase();
          return name.includes('forced') || 
                 name.includes('force') ||
                 name.includes('non-english') || 
                 name.includes('non english') ||
                 name.includes('foreign') ||
                 name.includes('foreign parts');
        });
      }

      // Sort by download count (most popular first)
      allResults.sort((a, b) => b.downloadCount - a.downloadCount);

      setSearchResults(allResults);

      if (allResults.length === 0) {
        setSearchError(forcedOnly 
          ? 'No forced subtitles found. Try searching without the forced filter.'
          : 'No subtitles found from any provider. Try different languages.');
      }
    } catch (error) {
      console.error('Subtitle search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Failed to search for subtitles');
    } finally {
      setIsSearching(false);
    }
  };

  const downloadMutation = useMutation({
    mutationFn: async (subtitle: SubtitleResult) => {
      // Determine if this is a forced subtitle
      const name = subtitle.releaseName.toLowerCase();
      const isForced = name.includes('forced') || 
                      name.includes('force') ||
                      name.includes('non-english') || 
                      name.includes('non english') ||
                      name.includes('foreign');

      if (subtitle.provider === 'subdl.com') {
        // SubDL: download ZIP and extract
        if (!subdlApiKey) throw new Error('SubDL API key not configured');
        if (typeof window === 'undefined' || !window.electron?.downloadAndExtractSubtitle) {
          throw new Error('This feature is only available in the desktop app');
        }
        const result = await window.electron.downloadAndExtractSubtitle({
          url: subtitle.url,
          mediaFilePath,
          languageCode: subtitle.languageCode,
          isForced,
        });
        return result;
      } else {
        // OpenSubtitles: download content directly and write to file
        if (!osCredentials) throw new Error('OpenSubtitles credentials not configured');
        if (typeof window === 'undefined' || !window.electron?.writeFile) {
          throw new Error('This feature is only available in the desktop app');
        }
        
        const provider = createOpenSubtitlesProvider(osCredentials);
        const { content } = await provider.download(subtitle.id);
        
        // Build output path: same folder as media file
        const sep = mediaFilePath.includes('\\') ? '\\' : '/';
        const mediaDir = mediaFilePath.substring(0, Math.max(mediaFilePath.lastIndexOf('/'), mediaFilePath.lastIndexOf('\\')));
        const mediaBaseName = mediaFilePath.substring(Math.max(mediaFilePath.lastIndexOf('/'), mediaFilePath.lastIndexOf('\\')) + 1).replace(/\.[^.]+$/, '');
        const ext = subtitle.format || 'srt';
        const langCode = subtitle.languageCode || 'en';
        const forcedSuffix = isForced ? '.forced' : '';
        const outputFileName = `${mediaBaseName}.${langCode}${forcedSuffix}.${ext}`;
        const outputPath = `${mediaDir}${sep}${outputFileName}`;
        
        await window.electron.writeFile(outputPath, content);
        return { success: true, path: outputPath, fileName: outputFileName };
      }
    },
    onSuccess: (result) => {
      console.log('[SubtitleSearchModal] Subtitle saved:', result.path);
      onSubtitleAdded();
      onClose();
    },
    onError: (error) => {
      console.error('Subtitle download error:', error);
      alert(error instanceof Error ? error.message : 'Failed to download subtitle');
    },
  });

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-text-primary truncate">
              Search Subtitles
            </h2>
            <p className="text-sm text-text-secondary truncate mt-1">
              {item.title} {item.year && `(${item.year})`}
            </p>
          </div>
          <Button
            variant="icon"
            onClick={onClose}
            className="ml-4"
            aria-label="Close"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            }
          />
        </div>

        {/* Language selector */}
        <div className="p-6 border-b border-border bg-background-secondary">
          {!subdlApiKey && !osCredentials && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    Subtitle Provider Required
                  </p>
                  <p className="text-xs text-yellow-800">
                    Configure at least one subtitle source in Settings &gt; API Keys:
                    <br />• <strong>SubDL</strong>: Get free API key at{' '}
                    <a href="https://subdl.com/panel/register" target="_blank" rel="noopener noreferrer" className="underline font-semibold">subdl.com</a>
                    <br />• <strong>OpenSubtitles</strong>: Free account at{' '}
                    <a href="https://www.opensubtitles.org/en/user/register" target="_blank" rel="noopener noreferrer" className="underline font-semibold">opensubtitles.org</a>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Provider status */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`px-2 py-1 text-xs rounded font-medium ${subdlApiKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              SubDL {subdlApiKey ? '✓' : '—'}
            </span>
            <span className={`px-2 py-1 text-xs rounded font-medium ${osCredentials ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              OpenSubtitles {osCredentials ? '✓' : '—'}
            </span>
          </div>
          
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Languages
          </h3>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => toggleLanguage(lang.code)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                  selectedLanguages.includes(lang.code)
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-white text-text-secondary border border-border hover:bg-background-secondary'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>
          
          {/* Forced subtitles filter */}
          <div className="mt-4 flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forcedOnly}
                onChange={(e) => setForcedOnly(e.target.checked)}
                className="w-4 h-4 accent-primary-500 bg-white border-border rounded focus:ring-primary-500 focus:ring-2"
              />
              <span className="text-sm text-text-primary">
                Forced subtitles only
              </span>
            </label>
            <div className="group relative">
              <svg className="w-4 h-4 text-text-tertiary cursor-help" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-10">
                Forced subtitles show only foreign language parts (e.g., alien speech, signs) in movies primarily in your language
              </div>
            </div>
          </div>
          
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={isSearching || selectedLanguages.length === 0 || (!subdlApiKey && !osCredentials)}
            loading={isSearching}
            className="mt-4"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          >
            Search
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {searchError && (
            <div className="bg-error-50 border border-error-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-error-800">{searchError}</p>
              </div>
            </div>
          )}

          {isSearching && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 mx-auto mb-4 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-text-secondary">Searching for subtitles...</p>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && !searchError && (
            <div className="text-center py-12 text-text-secondary">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm">Select languages and click Search</p>
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-3">
              {searchResults.map((subtitle, index) => (
                <div
                  key={`${subtitle.id}-${index}`}
                  className="border border-border rounded-xl p-4 hover:bg-background-secondary transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-text-primary mb-1">
                        {subtitle.releaseName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                        <span className={`px-2 py-1 rounded font-medium ${
                          subtitle.provider === 'subdl.com' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {subtitle.provider === 'subdl.com' ? 'SubDL' : 'OpenSubtitles'}
                        </span>
                        <span className="px-2 py-1 bg-primary-subtle text-primary-500 rounded font-medium">
                          {subtitle.language}
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                          {subtitle.format.toUpperCase()}
                        </span>
                        {subtitle.hearing_impaired && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-medium">
                            SDH/HI
                          </span>
                        )}
                        {(subtitle.releaseName.toLowerCase().includes('forced') || 
                          subtitle.releaseName.toLowerCase().includes('force') ||
                          subtitle.releaseName.toLowerCase().includes('non-english') ||
                          subtitle.releaseName.toLowerCase().includes('non english') ||
                          subtitle.releaseName.toLowerCase().includes('foreign')) && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-semibold">
                            FORCED
                          </span>
                        )}
                        {subtitle.fps && (
                          <span className="text-text-tertiary">
                            {subtitle.fps} FPS
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {subtitle.rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          {subtitle.downloadCount.toLocaleString()} downloads
                        </span>
                        <span>by {subtitle.uploader}</span>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => downloadMutation.mutate(subtitle)}
                      disabled={downloadMutation.isPending}
                      loading={downloadMutation.isPending}
                      icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      }
                    >
                      Select
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-text-tertiary">
                Powered by SubDL.com &amp; OpenSubtitles.org
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={onClose}
              className="ml-4"
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
