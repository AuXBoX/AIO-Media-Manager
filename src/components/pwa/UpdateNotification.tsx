import { useState, useEffect } from 'react';

type UpdateStatus = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const electron = (window as any).electron;
    if (!electron?.updater) return;

    // Set up event listeners
    const unsubAvailable = electron.updater.onAvailable((info: UpdateInfo) => {
      setUpdateInfo(info);
      setStatus('available');
      setDismissed(false);
    });

    const unsubProgress = electron.updater.onProgress((prog: DownloadProgress) => {
      setProgress(prog);
      setStatus('downloading');
    });

    const unsubDownloaded = electron.updater.onDownloaded((info: UpdateInfo) => {
      setUpdateInfo(info);
      setStatus('downloaded');
    });

    const unsubError = electron.updater.onError((err: { message: string }) => {
      // Silently ignore update errors - don't show to user
      console.warn('[Update] Error (suppressed):', err.message);
      setStatus('idle');
    });

    // Check for updates on mount
    electron.updater.getStatus().then((status: { available: UpdateInfo | null; downloaded: boolean }) => {
      if (status.available) {
        setUpdateInfo(status.available);
        setStatus(status.downloaded ? 'downloaded' : 'available');
      }
    });

    return () => {
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  }, []);

  const handleDownload = async () => {
    const electron = (window as any).electron;
    if (!electron?.updater) return;
    
    setStatus('downloading');
    setProgress(null);
    
    try {
      await electron.updater.downloadUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
      setStatus('error');
    }
  };

  const handleInstall = async () => {
    const electron = (window as any).electron;
    if (!electron?.updater) return;
    
    await electron.updater.installUpdate();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleRetry = () => {
    setError(null);
    setStatus('idle');
    const electron = (window as any).electron;
    if (electron?.updater) {
      electron.updater.checkForUpdates();
    }
  };

  // Don't show if dismissed or no update info
  if (dismissed || status === 'idle') return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatSpeed = (bytesPerSecond: number) => {
    return `${formatBytes(bytesPerSecond)}/s`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm animate-slide-in-up">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {status === 'downloaded' ? 'Update Ready' : 'Update Available'}
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {updateInfo && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Version <span className="font-medium text-gray-900 dark:text-white">{updateInfo.version}</span> is available
            </p>
          )}

          {/* Download Progress */}
          {status === 'downloading' && progress && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>{progress.percent.toFixed(0)}%</span>
                <span>{formatSpeed(progress.bytesPerSecond)}</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatBytes(progress.transferred)} / {formatBytes(progress.total)}
              </p>
            </div>
          )}

          {/* Downloading without progress yet */}
          {status === 'downloading' && !progress && (
            <div className="flex items-center gap-2 mb-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Starting download...</span>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error || 'An error occurred while updating'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {status === 'available' && (
              <>
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={handleDownload}
                  className="flex-1 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
                >
                  Update Now
                </button>
              </>
            )}

            {status === 'downloading' && (
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Minimize
              </button>
            )}

            {status === 'downloaded' && (
              <>
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  Restart & Install
                </button>
              </>
            )}

            {status === 'error' && (
              <>
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleRetry}
                  className="flex-1 px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
                >
                  Retry
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
