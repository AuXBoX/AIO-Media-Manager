function App() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900 flex items-center justify-center transition-colors">
      <div className="text-center max-w-2xl px-6">
        <h1 className="text-4xl font-bold text-secondary-900 dark:text-secondary-50 mb-4">
          AIO Media Manager
        </h1>
        <p className="text-lg text-secondary-600 dark:text-secondary-300 mb-8">
          View and edit metadata for movies, TV shows, and music in Plex Media
          Server libraries
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg shadow-medium transition-all duration-200 hover:shadow-hard">
            Get Started
          </button>
          <button className="px-6 py-3 bg-secondary-200 dark:bg-secondary-700 hover:bg-secondary-300 dark:hover:bg-secondary-600 text-secondary-900 dark:text-secondary-50 rounded-lg shadow-soft transition-all duration-200">
            Learn More
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
