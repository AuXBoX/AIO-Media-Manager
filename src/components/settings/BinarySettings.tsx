import { useState, useEffect } from 'react';

interface BinarySettingsProps {
  saving?: boolean;
}

export function BinarySettings({ saving }: BinarySettingsProps) {
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [binaryPaths, setBinaryPaths] = useState<{ ytdlp: string; ffmpeg: string } | null>(null);

  useEffect(() => {
    loadBinaryInfo();
  }, []);

  const loadBinaryInfo = async () => {
    try {
      setError(null);
      
      // Get current version
      const versionResult = await window.electron?.binaries.getVersion();
      if (versionResult?.success && versionResult.version) {
        setCurrentVersion(versionResult.version);
      }

      // Get binary paths
      const pathsResult = await window.electron?.binaries.getPaths();
      if (pathsResult?.success && pathsResult.paths) {
        setBinaryPaths(pathsResult.paths);
      }
    } catch (err) {
      console.error('Failed to load binary info:', err);
      setError('Failed to load binary information');
    }
  };

  const handleCheckUpdate = async () => {
    try {
      setChecking(true);
      setError(null);
      setSuccess(null);

      const result = await window.electron?.binaries.checkUpdate();
      
      if (result?.success) {
        setLatestVersion(result.latestVersion || null);
        setUpdateAvailable(result.updateAvailable || false);
        
        if (result.updateAvailable) {
          setSuccess(`Update available: ${result.latestVersion}`);
        } else {
          setSuccess('You have the latest version');
        }
      } else {
        setError(result?.error || 'Failed to check for updates');
      }
    } catch (err) {
      console.error('Failed to check for updates:', err);
      setError('Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const handleUpdate = async () => {
    if (!confirm('This will update yt-dlp to the latest version. Continue?')) {
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      setSuccess(null);

      const result = await window.electron?.binaries.update();
      
      if (result?.success) {
        setCurrentVersion(result.version || null);
        setUpdateAvailable(false);
        setSuccess(`Successfully updated to version ${result.version}`);
        
        // Reload binary info
        await loadBinaryInfo();
      } else {
        setError(result?.error || 'Failed to update');
      }
    } catch (err) {
      console.error('Failed to update:', err);
      setError('Failed to update yt-dlp');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Binary Management
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Manage external binaries used by the application (yt-dlp, ffmpeg)
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* yt-dlp Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
              yt-dlp
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Used for downloading YouTube trailers
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Current Version:</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {currentVersion || 'Loading...'}
                </span>
              </div>
              
              {latestVersion && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Latest Version:</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {latestVersion}
                  </span>
                  {updateAvailable && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                      Update Available
                    </span>
                  )}
                </div>
              )}

              {binaryPaths?.ytdlp && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Path:</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                    {binaryPaths.ytdlp}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={handleCheckUpdate}
              disabled={checking || updating || saving}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
            >
              {checking ? 'Checking...' : 'Check for Updates'}
            </button>

            {updateAvailable && (
              <button
                onClick={handleUpdate}
                disabled={checking || updating || saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm whitespace-nowrap"
              >
                {updating ? 'Updating...' : 'Update Now'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ffmpeg Section */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-base font-medium text-gray-900 dark:text-white mb-2">
              ffmpeg
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Used for video/audio processing and subtitle extraction
            </p>
            
            {binaryPaths?.ffmpeg && (
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-gray-600 dark:text-gray-400">Path:</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                    {binaryPaths.ffmpeg}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">About Binary Updates</p>
            <p>
              The application uses bundled binaries that are included with the installation. 
              You can check for updates to yt-dlp to ensure compatibility with the latest YouTube changes.
              Updates are downloaded from the official GitHub repository.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
