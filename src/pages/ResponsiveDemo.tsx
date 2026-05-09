import { useState } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTouchGestures } from '@/hooks/useTouchGestures';
import { ResponsiveLayout, ResponsiveHeader, ResponsiveContent } from '@/components/layout/ResponsiveLayout';
import { ResponsiveContainer, ResponsiveGrid, ResponsiveSection } from '@/components/ui/ResponsiveContainer';
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import { SidebarItem, SidebarSection } from '@/components/ui/ResponsiveSidebar';

// Simple icon components
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const LibraryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

/**
 * Demo page showcasing responsive design features
 */
export function ResponsiveDemo() {
  const { currentBreakpoint, isMobile, isTablet, isTouchDevice } = useBreakpoint();
  const [swipeCount, setSwipeCount] = useState(0);
  const [pinchScale, setPinchScale] = useState(1);

  // Touch gesture demo
  const gestureRef = useTouchGestures({
    onSwipeLeft: () => setSwipeCount((c) => c + 1),
    onSwipeRight: () => setSwipeCount((c) => c + 1),
    onPinchZoom: (scale) => setPinchScale(scale),
  });

  // Sidebar content
  const sidebar = (
    <>
      <SidebarSection title="Navigation">
        <SidebarItem icon={<HomeIcon />} label="Home" isActive />
        <SidebarItem icon={<LibraryIcon />} label="Library" />
        <SidebarItem icon={<SettingsIcon />} label="Settings" />
        <SidebarItem icon={<InfoIcon />} label="About" />
      </SidebarSection>
    </>
  );

  // Header content
  const header = (
    <ResponsiveHeader
      title="Responsive Design Demo"
      breadcrumbs={<span>Home / Demo</span>}
      actions={
        <button className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
          Action
        </button>
      }
    />
  );

  return (
    <ResponsiveLayout sidebar={sidebar} header={header}>
      <ResponsiveContent>
        <ResponsiveContainer maxWidth="2xl">
          {/* Breakpoint Info */}
          <ResponsiveSection>
            <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-soft">
              <h2 className="text-xl font-bold mb-4 text-secondary-900 dark:text-secondary-50">
                Current Breakpoint
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-secondary-600 dark:text-secondary-400">Breakpoint</div>
                  <div className="text-lg font-semibold text-secondary-900 dark:text-secondary-50">
                    {currentBreakpoint}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600 dark:text-secondary-400">Device</div>
                  <div className="text-lg font-semibold text-secondary-900 dark:text-secondary-50">
                    {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600 dark:text-secondary-400">Touch</div>
                  <div className="text-lg font-semibold text-secondary-900 dark:text-secondary-50">
                    {isTouchDevice ? 'Yes' : 'No'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-secondary-600 dark:text-secondary-400">Width</div>
                  <div className="text-lg font-semibold text-secondary-900 dark:text-secondary-50">
                    {window.innerWidth}px
                  </div>
                </div>
              </div>
            </div>
          </ResponsiveSection>

          {/* Touch Gestures Demo */}
          {isTouchDevice && (
            <ResponsiveSection>
              <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-soft">
                <h2 className="text-xl font-bold mb-4 text-secondary-900 dark:text-secondary-50">
                  Touch Gestures
                </h2>
                <div
                  ref={gestureRef}
                  className="h-48 bg-secondary-100 dark:bg-secondary-700 rounded-lg flex items-center justify-center"
                >
                  <div className="text-center">
                    <p className="text-secondary-600 dark:text-secondary-400 mb-2">
                      Swipe or pinch this area
                    </p>
                    <p className="text-2xl font-bold text-secondary-900 dark:text-secondary-50">
                      Swipes: {swipeCount}
                    </p>
                    <p className="text-lg text-secondary-700 dark:text-secondary-300">
                      Scale: {pinchScale.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </ResponsiveSection>
          )}

          {/* Responsive Grid Demo */}
          <ResponsiveSection>
            <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-soft">
              <h2 className="text-xl font-bold mb-4 text-secondary-900 dark:text-secondary-50">
                Responsive Grid
              </h2>
              <ResponsiveGrid minColumnWidth={150} maxColumns={6} gap="md">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center"
                  >
                    <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </ResponsiveGrid>
            </div>
          </ResponsiveSection>

          {/* Progressive Image Demo */}
          <ResponsiveSection>
            <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-soft">
              <h2 className="text-xl font-bold mb-4 text-secondary-900 dark:text-secondary-50">
                Progressive Image Loading
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-video">
                    <ProgressiveImage
                      src={`https://picsum.photos/800/600?random=${i}`}
                      lowQualitySrc={`https://picsum.photos/200/150?random=${i}`}
                      alt={`Demo image ${i + 1}`}
                      className="w-full h-full rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          </ResponsiveSection>

          {/* Responsive Typography */}
          <ResponsiveSection>
            <div className="bg-white dark:bg-secondary-800 rounded-lg p-6 shadow-soft">
              <h2 className="text-xl font-bold mb-4 text-secondary-900 dark:text-secondary-50">
                Responsive Typography
              </h2>
              <div className="space-y-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-secondary-900 dark:text-secondary-50">
                  Heading 1
                </h1>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-secondary-900 dark:text-secondary-50">
                  Heading 2
                </h2>
                <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-secondary-900 dark:text-secondary-50">
                  Heading 3
                </h3>
                <p className="text-sm md:text-base lg:text-lg text-secondary-600 dark:text-secondary-400">
                  Body text that scales with screen size. This demonstrates how typography
                  adapts to different breakpoints for optimal readability.
                </p>
              </div>
            </div>
          </ResponsiveSection>

          {/* Responsive Spacing */}
          <ResponsiveSection>
            <div className="bg-white dark:bg-secondary-800 rounded-lg p-4 md:p-6 lg:p-8 shadow-soft">
              <h2 className="text-xl font-bold mb-4 text-secondary-900 dark:text-secondary-50">
                Responsive Spacing
              </h2>
              <p className="text-secondary-600 dark:text-secondary-400">
                This card has responsive padding: 16px on mobile, 24px on tablet, and 32px on desktop.
              </p>
            </div>
          </ResponsiveSection>
        </ResponsiveContainer>
      </ResponsiveContent>
    </ResponsiveLayout>
  );
}
