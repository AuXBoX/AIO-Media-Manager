import { FC, useState } from 'react';
import { Skeleton, SkeletonText, SkeletonCard } from './Skeleton';
import { Spinner, SpinnerOverlay } from './Spinner';
import { Button } from './Button';
import { TableLoadingState } from './TableLoadingState';
import { GridLoadingState } from './GridLoadingState';

/**
 * LoadingStatesShowcase Component
 * 
 * Comprehensive showcase of all loading states in the Plex Pro design system.
 * This component demonstrates:
 * - Skeleton loaders for content placeholders
 * - Spinners with different sizes and variants
 * - Button loading states
 * - Table and grid loading states
 * - Overlay loading states
 * 
 * Updated for Task 24: All loading states now use the Plex Pro blue (#3B82F6)
 * and match the modern, clean design aesthetic.
 */
export const LoadingStatesShowcase: FC = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);

  const handleButtonClick = () => {
    setButtonLoading(true);
    setTimeout(() => setButtonLoading(false), 2000);
  };

  const handleOverlayToggle = () => {
    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background-primary p-8 space-y-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Loading States</h1>
        <p className="text-text-secondary mb-8">
          Comprehensive showcase of all loading states in the Plex Pro design system
        </p>

        {/* Spinners Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Spinners</h2>
            <p className="text-text-secondary mb-6">
              Loading spinners in various sizes and color variants using Plex Pro blue (#3B82F6)
            </p>
          </div>

          {/* Spinner Sizes */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Sizes</h3>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Spinner size="xs" />
                <span className="text-xs text-text-tertiary">Extra Small</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="sm" />
                <span className="text-xs text-text-tertiary">Small</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="md" />
                <span className="text-xs text-text-tertiary">Medium</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" />
                <span className="text-xs text-text-tertiary">Large</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner size="xl" />
                <span className="text-xs text-text-tertiary">Extra Large</span>
              </div>
            </div>
          </div>

          {/* Spinner Variants */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Variants</h3>
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <Spinner variant="primary" />
                <span className="text-xs text-text-tertiary">Primary (Blue)</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Spinner variant="secondary" />
                <span className="text-xs text-text-tertiary">Secondary (Gray)</span>
              </div>
              <div className="flex flex-col items-center gap-2 bg-slate-800 p-4 rounded-lg">
                <Spinner variant="white" />
                <span className="text-xs text-white">White</span>
              </div>
            </div>
          </div>

          {/* Spinner with Label */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">With Label</h3>
            <div className="flex items-center gap-8">
              <Spinner size="md" label="Loading..." showLabel />
              <Spinner size="lg" label="Please wait..." showLabel />
            </div>
          </div>
        </section>

        {/* Skeleton Loaders Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Skeleton Loaders</h2>
            <p className="text-text-secondary mb-6">
              Content placeholders with subtle animations
            </p>
          </div>

          {/* Basic Skeletons */}
          <div className="bg-white rounded-lg border border-border p-6 space-y-4">
            <h3 className="text-lg font-medium text-text-primary mb-4">Basic Shapes</h3>
            <div className="space-y-4">
              <Skeleton width="100%" height="20px" />
              <Skeleton width="80%" height="20px" />
              <Skeleton width="60%" height="20px" />
            </div>
          </div>

          {/* Skeleton Text */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Text Skeleton</h3>
            <SkeletonText lines={3} />
          </div>

          {/* Skeleton Cards */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Card Skeletons</h3>
            <div className="grid grid-cols-4 gap-6">
              <SkeletonCard width="100%" height="300px" showText textLines={2} />
              <SkeletonCard width="100%" height="300px" showText textLines={2} />
              <SkeletonCard width="100%" height="300px" showText textLines={2} />
              <SkeletonCard width="100%" height="300px" showText textLines={2} />
            </div>
          </div>
        </section>

        {/* Button Loading States */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Button Loading States</h2>
            <p className="text-text-secondary mb-6">
              Buttons with integrated loading spinners
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" loading>
                Loading...
              </Button>
              <Button variant="secondary" loading>
                Loading...
              </Button>
              <Button variant="ghost" loading>
                Loading...
              </Button>
              <Button variant="primary" loading={buttonLoading} onClick={handleButtonClick}>
                Click to Load
              </Button>
            </div>
          </div>
        </section>

        {/* Table Loading State */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Table Loading State</h2>
            <p className="text-text-secondary mb-6">
              Skeleton loader for table views with proper column structure
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border overflow-hidden" style={{ height: '500px' }}>
            <TableLoadingState
              rows={8}
              showPosters
              rowHeightMode="comfortable"
              showCheckbox
              columns={[
                { width: '40%', label: 'Title' },
                { width: '15%', label: 'Year' },
                { width: '15%', label: 'Rating' },
                { width: '15%', label: 'Status' },
                { width: '15%', label: 'Actions' },
              ]}
            />
          </div>
        </section>

        {/* Grid Loading State */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Grid Loading State</h2>
            <p className="text-text-secondary mb-6">
              Skeleton loader for grid views with responsive columns
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border overflow-hidden" style={{ height: '600px' }}>
            <GridLoadingState
              count={20}
              columns={5}
              posterSize={180}
              showText
            />
          </div>
        </section>

        {/* Overlay Loading State */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Overlay Loading State</h2>
            <p className="text-text-secondary mb-6">
              Full-screen or container overlay with centered spinner
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border p-6">
            <Button variant="primary" onClick={handleOverlayToggle}>
              Show Overlay (2s)
            </Button>
          </div>

          <div className="bg-white rounded-lg border border-border overflow-hidden relative" style={{ height: '400px' }}>
            <div className="p-6">
              <h3 className="text-lg font-medium text-text-primary mb-4">Container with Overlay</h3>
              <p className="text-text-secondary">
                This container demonstrates an overlay loading state. Click the button above to see it in action.
              </p>
            </div>
            {showOverlay && (
              <SpinnerOverlay message="Loading content..." opacity="medium" />
            )}
          </div>
        </section>

        {/* Inline Loading Indicators */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Inline Loading Indicators</h2>
            <p className="text-text-secondary mb-6">
              Small loading indicators for inline use
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              <span className="text-sm text-slate-600">Loading more items...</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
              <span className="text-sm text-slate-600">Processing request...</span>
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-subtle rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span className="text-sm font-medium text-primary-700">Saving changes...</span>
            </div>
          </div>
        </section>

        {/* Full Page Loading */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Full Page Loading</h2>
            <p className="text-text-secondary mb-6">
              Centered loading state for full page loads
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border overflow-hidden" style={{ height: '400px' }}>
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-slate-600">Loading content...</p>
              </div>
            </div>
          </div>
        </section>

        {/* Loading State Best Practices */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Best Practices</h2>
          </div>

          <div className="bg-white rounded-lg border border-border p-6">
            <ul className="space-y-3 text-text-secondary">
              <li className="flex items-start gap-3">
                <span className="text-primary-500 font-bold">•</span>
                <span>Use skeleton loaders for content that has a predictable structure (tables, grids, cards)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary-500 font-bold">•</span>
                <span>Use spinners for indeterminate loading states or when the structure is unknown</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary-500 font-bold">•</span>
                <span>Always provide accessible labels for screen readers (aria-label or sr-only text)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary-500 font-bold">•</span>
                <span>Use button loading states to prevent double-clicks and show progress</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary-500 font-bold">•</span>
                <span>Keep loading messages concise and informative</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary-500 font-bold">•</span>
                <span>Use the Plex Pro blue (#3B82F6) for all primary loading indicators</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};
