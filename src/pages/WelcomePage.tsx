import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { useEffect } from 'react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SkipLinks } from '@/components/ui/SkipLink';

export function WelcomePage() {
  const navigate = useNavigate();
  const { currentToken, serverConnection } = useAppStore();

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (currentToken && serverConnection) {
      navigate('/app/library', { replace: true });
    } else if (currentToken) {
      navigate('/servers', { replace: true });
    }
  }, [currentToken, serverConnection, navigate]);

  const handleGetStarted = () => {
    navigate('/auth');
  };

  const handleLearnMore = () => {
    // Open documentation or show info modal
    window.open('https://github.com/yourusername/aio-media-manager', '_blank');
  };

  return (
    <>
      <SkipLinks
        links={[
          { targetId: 'main-content', label: 'Skip to main content' },
        ]}
      />

      {/* Theme toggle in top-right corner */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle variant="icon" />
      </div>

      <main 
        id="main-content" 
        className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center transition-colors"
        tabIndex={-1}
      >
        <div className="text-center max-w-2xl px-6">
          <h1 className="text-4xl font-bold text-secondary-900 dark:text-secondary-50 mb-4">
            AIO Media Manager
          </h1>
          <p className="text-lg text-secondary-600 dark:text-secondary-300 mb-8">
            View and edit metadata for movies, TV shows, and music in Plex Media
            Server libraries
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={handleGetStarted}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg shadow-medium transition-all duration-200 hover:shadow-hard focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
              aria-label="Get started with AIO Media Manager"
            >
              Get Started
            </button>
            <button 
              onClick={handleLearnMore}
              className="px-6 py-3 bg-secondary-200 dark:bg-secondary-700 hover:bg-secondary-300 dark:hover:bg-secondary-600 text-secondary-900 dark:text-secondary-50 rounded-lg shadow-soft transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-secondary-600 focus:ring-offset-2"
              aria-label="Learn more about AIO Media Manager"
            >
              Learn More
            </button>
          </div>

          {/* Features list */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-soft">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                Browse Libraries
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-300">
                Access all your Plex media libraries in one place
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-soft">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                Edit Metadata
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-300">
                Update titles, descriptions, artwork, and more
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-soft">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </div>
              <h3 className="font-semibold text-secondary-900 dark:text-secondary-50 mb-2">
                Offline Support
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-300">
                Work offline and sync changes when reconnected
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
