import { FC, useState } from 'react';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonTable } from './Skeleton';
import { Spinner, SpinnerOverlay } from './Spinner';
import { Button } from './Button';
import { TableLoadingState } from './TableLoadingState';
import { GridLoadingState, GridLoadingStateResponsive } from './GridLoadingState';

/**
 * LoadingStates Example Component
 * 
 * Comprehensive showcase of all loading state components in the Plex Pro design system.
 * This component demonstrates:
 * - Skeleton loaders for content placeholders
 * - Spinners with different sizes and variants
 * - Button loading states
 * - Table and grid loading states
 * 
 * Use this as a reference for implementing loading states throughout the application.
 */
export const LoadingStatesExample: FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const handleLoadingClick = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleOverlayClick = () => {
    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background-primary p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Loading States - Plex Pro Design System
          </h1>
          <p className="text-text-secondary">
            Comprehensive showcase of all loading state components with soft blue accents (#E5A00D)
          </p>
        </div>

        {/* Spinners Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Spinners</h2>
            <p className="text-text-secondary mb-6">
              Loading spinners in various sizes and color variants
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
              <div className="flex flex-col items-center gap-2 bg-slate-800 p-4 rounded">
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
              <Spinner size="lg" label="Processing..." showLabel />
            </div>
          </div>

          {/* Spinner Overlay */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Overlay</h3>
            <div className="relative h-64 bg-slate-100 rounded-lg overflow-hidden">
              <div className="p-6">
                <h4 className="text-lg font-medium mb-2">Content Area</h4>
                <p className="text-text-secondary">
                  This content is behind the overlay. Click the button to show the loading overlay.
                </p>
                <Button variant="primary" onClick={handleOverlayClick} className="mt-4">
                  Show Overlay
                </Button>
              </div>
              {showOverlay && <SpinnerOverlay message="Loading content..." />}
            </div>
          </div>
        </section>

        {/* Skeleton Loaders Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Skeleton Loaders</h2>
            <p className="text-text-secondary mb-6">
              Content placeholders that mimic the shape of loading content
            </p>
          </div>

          {/* Basic Skeletons */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Basic Shapes</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-text-tertiary mb-2">Rectangle</p>
                <Skeleton width="100%" height="20px" />
              </div>
              <div>
                <p className="text-sm text-text-tertiary mb-2">Circle</p>
                <Skeleton width="40px" height="40px" rounded="full" />
              </div>
              <div>
                <p className="text-sm text-text-tertiary mb-2">Rounded Rectangle</p>
                <Skeleton width="200px" height="100px" rounded="lg" />
              </div>
            </div>
          </div>

          {/* Skeleton Text */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Text Skeleton</h3>
            <div className="space-y-6">
              <div>
                <p className="text-sm text-text-tertiary mb-2">Single Line</p>
                <SkeletonText lines={1} />
              </div>
              <div>
                <p className="text-sm text-text-tertiary mb-2">Multiple Lines</p>
                <SkeletonText lines={3} />
              </div>
              <div>
                <p className="text-sm text-text-tertiary mb-2">Paragraph</p>
                <SkeletonText lines={5} lastLineWidth="60%" />
              </div>
            </div>
          </div>

          {/* Skeleton Card */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Card Skeleton</h3>
            <div className="flex gap-6">
              <SkeletonCard width="180px" height="270px" showText textLines={2} />
              <SkeletonCard width="180px" height="270px" showText textLines={2} />
              <SkeletonCard width="180px" height="270px" showText textLines={2} />
            </div>
          </div>

          {/* Skeleton Table */}
          <div className="bg-white rounded-lg border border-border p-6">
            <h3 className="text-lg font-medium text-text-primary mb-4">Table Skeleton</h3>
            <SkeletonTable 
              rows={5} 
              columnWidths={['40%', '20%', '20%', '20%']} 
              showHeader 
            />
          </div>
        </section>

        {/* Button Loading States Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Button Loading States</h2>
            <p className="text-text-secondary mb-6">
              Buttons with integrated loading spinners
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border p-6">
            <div className="flex flex-wrap gap-4">
              <Button variant="primary" onClick={handleLoadingClick} loading={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="secondary" loading={isLoading}>
                Cancel
              </Button>
              <Button variant="ghost" loading={isLoading}>
                Learn More
              </Button>
              <Button variant="primary" size="small" loading={isLoading}>
                Small Button
              </Button>
              <Button variant="primary" size="large" loading={isLoading}>
                Large Button
              </Button>
            </div>
            <p className="text-sm text-text-tertiary mt-4">
              Click "Save Changes" to see the loading state in action
            </p>
          </div>
        </section>

        {/* Table Loading State Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Table Loading State</h2>
            <p className="text-text-secondary mb-6">
              Full table skeleton with proper column structure
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border overflow-hidden">
            <div className="relative h-96">
              <TableLoadingState 
                rows={8}
                columns={[
                  { width: '40%', label: 'Title' },
                  { width: '15%', label: 'Year' },
                  { width: '15%', label: 'Rating' },
                  { width: '15%', label: 'Status' },
                  { width: '15%', label: 'Actions' },
                ]}
                showPosters
                showCheckbox
              />
            </div>
          </div>
        </section>

        {/* Grid Loading State Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Grid Loading State</h2>
            <p className="text-text-secondary mb-6">
              Grid skeleton for poster/card views
            </p>
          </div>

          <div className="bg-white rounded-lg border border-border overflow-hidden">
            <div className="relative h-96">
              <GridLoadingState 
                count={12}
                columns={6}
                posterSize={140}
                showText
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border overflow-hidden">
            <h3 className="text-lg font-medium text-text-primary p-6 pb-0">Responsive Grid</h3>
            <div className="relative h-96">
              <GridLoadingStateResponsive 
                count={15}
                minCardWidth={160}
                showText
              />
            </div>
          </div>
        </section>

        {/* Usage Guidelines */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Usage Guidelines</h2>
          </div>

          <div className="bg-white rounded-lg border border-border p-6">
            <div className="prose prose-slate max-w-none">
              <h3 className="text-lg font-medium text-text-primary mb-3">When to Use Each Loading State</h3>
              
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium text-text-primary">Spinners</h4>
                  <p className="text-text-secondary">
                    Use for short operations ({"<"}3 seconds) or when the content structure is unknown.
                    Good for button actions, form submissions, and API calls.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary">Skeleton Loaders</h4>
                  <p className="text-text-secondary">
                    Use for longer operations or when you know the content structure.
                    Provides better perceived performance by showing the layout immediately.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary">Table/Grid Loading States</h4>
                  <p className="text-text-secondary">
                    Use when loading lists or grids of items. Maintains layout stability and
                    provides context about what's being loaded.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-text-primary">Button Loading States</h4>
                  <p className="text-text-secondary">
                    Always use for buttons that trigger async operations. Prevents double-clicks
                    and provides clear feedback that the action is processing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
