import React, { useState } from 'react';
import { AppSettings } from '@/managers/SettingsManager';

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

  const handleSave = async () => {
    await onSave({
      tmdbApiKey: tmdbKey || undefined,
      fanartApiKey: fanartKey || undefined,
      tvdbApiKey: tvdbKey || undefined,
    });
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
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Why do I need API keys?
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
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
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="text-blue-600 dark:text-blue-400 hover:underline"
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
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="text-blue-600 dark:text-blue-400 hover:underline"
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
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              thetvdb.com/api-information
            </a>
          </span>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save API Keys
            </>
          )}
        </button>
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
