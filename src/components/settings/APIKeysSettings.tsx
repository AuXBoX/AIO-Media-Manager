import React, { useState } from 'react';
import { AppSettings } from '@/managers/SettingsManager';
import { Button } from '@/components/ui/Button';

interface APIKeysSettingsProps {
  settings: AppSettings;
  onSave: (updates: Partial<AppSettings>) => Promise<void>;
  saving: boolean;
}

export const APIKeysSettings: React.FC<APIKeysSettingsProps> = ({
  settings,
  onSave,
  saving,
}) => {
  const [tmdbKey, setTmdbKey] = useState(settings.tmdbApiKey || '');
  const [fanartKey, setFanartKey] = useState(settings.fanartApiKey || '');
  const [tvdbKey, setTvdbKey] = useState(settings.tvdbApiKey || '');
  const [lastfmKey, setLastfmKey] = useState(settings.lastfmApiKey || '');
  const [subdlKey, setSubdlKey] = useState(settings.subdlApiKey || '');
  const [testingSubdl, setTestingSubdl] = useState(false);
  const [subdlTestResult, setSubdlTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSave = async () => {
    await onSave({
      tmdbApiKey: tmdbKey || undefined,
      fanartApiKey: fanartKey || undefined,
      tvdbApiKey: tvdbKey || undefined,
      lastfmApiKey: lastfmKey || undefined,
      subdlApiKey: subdlKey || undefined,
    });
  };

  const testSubdlKey = async () => {
    if (!subdlKey.trim()) {
      setSubdlTestResult({
        success: false,
        message: 'Please enter a SubDL API key first.',
      });
      return;
    }

    setTestingSubdl(true);
    setSubdlTestResult(null);

    try {
      const { createSubDLProvider } = await import('@/providers/SubDLProvider');
      const provider = createSubDLProvider(subdlKey.trim());
      
      console.log('[APIKeysSettings] Testing SubDL API key...');
      
      // Test with a simple search (The Matrix)
      const results = await provider.search({
        title: 'The Matrix',
        year: 1999,
        imdbId: 'tt0133093',
        languages: ['en'],
      });

      console.log('[APIKeysSettings] Test results:', results);

      if (results && results.length > 0) {
        setSubdlTestResult({
          success: true,
          message: `API key is valid! Found ${results.length} subtitle(s) in test search.`,
        });
      } else {
        setSubdlTestResult({
          success: true,
          message: 'API key is valid, but no results found in test search.',
        });
      }
    } catch (error) {
      console.error('[APIKeysSettings] SubDL API test error:', error);
      setSubdlTestResult({
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setTestingSubdl(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          API Keys
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure API keys for external metadata providers. These keys are stored locally and never shared.
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-100 mb-1">
              Why do I need API keys?
            </h3>
            <p className="text-sm text-primary-800 dark:text-primary-200">
              API keys allow the app to fetch high-quality metadata, images, and trailers from external sources. 
              The app includes fallback keys for TMDB, but adding your own keys provides better rate limits and access to additional providers like Fanart.tv.
            </p>
          </div>
        </div>
      </div>

      {/* TMDB API Key */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              TMDB API Key
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              The Movie Database - Movies and TV shows metadata
            </p>
          </div>
          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
            Optional
          </span>
        </div>
        <input
          type="password"
          value={tmdbKey}
          onChange={(e) => setTmdbKey(e.target.value)}
          placeholder="Enter your TMDB API key (optional - fallback key included)"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Get your free API key at{' '}
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              themoviedb.org/settings/api
            </a>
          </span>
        </div>
      </div>

      {/* Fanart.tv API Key */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Fanart.tv API Key
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              High-quality artwork - Posters, backgrounds, logos, banners
            </p>
          </div>
          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
            Recommended
          </span>
        </div>
        <input
          type="password"
          value={fanartKey}
          onChange={(e) => setFanartKey(e.target.value)}
          placeholder="Enter your Fanart.tv API key"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Get your free API key at{' '}
            <a
              href="https://fanart.tv/get-an-api-key/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              fanart.tv/get-an-api-key
            </a>
          </span>
        </div>
      </div>

      {/* TVDB API Key */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              TVDB API Key
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              TheTVDB - TV shows and episodes metadata
            </p>
          </div>
          <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
            Optional
          </span>
        </div>
        <input
          type="password"
          value={tvdbKey}
          onChange={(e) => setTvdbKey(e.target.value)}
          placeholder="Enter your TVDB API key (optional)"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Get your free API key at{' '}
            <a
              href="https://thetvdb.com/api-information"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              thetvdb.com/api-information
            </a>
          </span>
        </div>
      </div>

      {/* Last.fm API Key */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              Last.fm API Key
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Last.fm - Music metadata, artist images, and album artwork
            </p>
          </div>
          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
            Recommended
          </span>
        </div>
        <input
          type="password"
          value={lastfmKey}
          onChange={(e) => setLastfmKey(e.target.value)}
          placeholder="Enter your Last.fm API key"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Get your free API key at{' '}
            <a
              href="https://www.last.fm/api/account/create"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              last.fm/api/account/create
            </a>
          </span>
        </div>
      </div>

      {/* SubDL API Key */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white">
              SubDL API Key
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              SubDL.com - Subtitle search and download
            </p>
          </div>
          <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
            Recommended
          </span>
        </div>
        <input
          type="password"
          value={subdlKey}
          onChange={(e) => setSubdlKey(e.target.value)}
          placeholder="Enter your SubDL API key"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={testSubdlKey}
            disabled={testingSubdl || !subdlKey.trim()}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {testingSubdl ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Testing...
              </>
            ) : (
              'Test API Key'
            )}
          </button>
          {subdlTestResult && (
            <div className={`flex items-center gap-1.5 text-xs ${
              subdlTestResult.success 
                ? 'text-green-700 dark:text-green-400' 
                : 'text-red-700 dark:text-red-400'
            }`}>
              {subdlTestResult.success ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span>{subdlTestResult.message}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Get your free API key at{' '}
            <a
              href="https://subdl.com/panel/register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              subdl.com/panel/register
            </a>
          </span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          loading={saving}
          icon={
            !saving && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )
          }
        >
          {saving ? 'Saving...' : 'Save API Keys'}
        </Button>
      </div>

      {/* Security Note */}
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              Security & Privacy
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your API keys are stored locally on your device and are never transmitted to any server except the respective API providers (TMDB, Fanart.tv, TVDB) when fetching metadata.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
