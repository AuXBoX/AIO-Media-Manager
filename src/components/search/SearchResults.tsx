import { SearchHub, SearchResultItem } from '../../managers/SearchManager';

interface SearchResultsProps {
  hubs: SearchHub[];
  isLoading?: boolean;
  onItemClick: (item: SearchResultItem) => void;
  serverUrl: string;
  token: string;
}

/**
 * SearchResults Component
 * Displays search results organized by hubs
 */
export function SearchResults({
  hubs,
  isLoading = false,
  onItemClick,
  serverUrl,
  token,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" role="status" aria-label="Loading search results"></div>
      </div>
    );
  }

  if (hubs.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No results found
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Try adjusting your search query
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {hubs.map((hub) => (
        <div key={hub.title}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {hub.title}
            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
              ({hub.size})
            </span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {hub.items.map((item) => (
              <SearchResultCard
                key={item.ratingKey}
                item={item}
                onClick={() => onItemClick(item)}
                serverUrl={serverUrl}
                token={token}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface SearchResultCardProps {
  item: SearchResultItem;
  onClick: () => void;
  serverUrl: string;
  token: string;
}

function SearchResultCard({ item, onClick, serverUrl, token }: SearchResultCardProps) {
  const thumbUrl = item.thumb
    ? `${serverUrl}${item.thumb}?X-Plex-Token=${token}`
    : null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" role="img" aria-label={item.title}>
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {item.title}
        </h3>
        {item.year && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{item.year}</p>
        )}
      </div>
    </div>
  );
}
