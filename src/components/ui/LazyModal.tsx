import { Suspense, ComponentType, lazy } from 'react';

interface LazyModalProps {
  isOpen: boolean;
  onClose: () => void;
  [key: string]: any;
}

/**
 * Wrapper for lazy-loading modal components
 * Provides loading state while modal code is being fetched
 */
export function createLazyModal<P extends LazyModalProps>(
  importFn: () => Promise<{ default: ComponentType<P> }>
) {
  const LazyComponent = lazy(importFn);

  return (props: P) => {
    // Don't render anything if modal is not open
    if (!props.isOpen) {
      return null;
    }

    return (
      <Suspense
        fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-xl">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                <span className="text-secondary-700 dark:text-secondary-200">
                  Loading...
                </span>
              </div>
            </div>
          </div>
        }
      >
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}

// Pre-configured lazy modals for common use cases
export const LazyExternalSearchModal = createLazyModal(
  () => import('@/components/external/ExternalSearchModal')
);

export const LazyMatchCandidatesModal = createLazyModal(
  () => import('@/components/match/MatchCandidatesModal')
);

export const LazyConflictResolutionModal = createLazyModal(
  () => import('@/components/offline/ConflictResolutionModal')
);

export const LazyArtworkUploadModal = createLazyModal(
  () => import('@/components/artwork/ArtworkUploadModal')
);

export const LazyOperationProgressModal = createLazyModal(
  () => import('@/components/batch/OperationProgressModal')
);

export const LazyLocalChangeConflictModal = createLazyModal(
  () => import('@/components/local-metadata/LocalChangeConflictModal')
);
