import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';
import { createLibraryManager } from '@/managers/LibraryManager';
import { createPlexClient } from '@/api/plexClient';
import { queryKeys } from '@/api/queryKeys';
import { CachedDataBadge } from '@/components/offline/CachedDataBadge';
import { useState, useEffect } from 'react';
import { db } from '@/db/database';

/**
 * LibraryList Component
 * Displays a list of library sections in the sidebar
 */
export function LibraryList() {
  const { serverConnection, currentToken, selectedLibrary, selectLibrary, isOnline } = useAppStore();
  const [cachedSections, setCachedSections] = useState<Set<string>>(new Set());

  // Fetch library sections
  const { data: sections, isLoading, error } = useQuery({
    queryKey: queryKeys.libraries,
    queryFn: async () => {
      if (!serverConnection || !currentToken) {
        throw new Error('No server connection or token');
      }

      const client = createPlexClient({
        baseURL: serverConnection.uri,
        token: currentToken,
      });

      const manager = createLibraryManager(client);
      return manager.getLibrarySections();
    },
    enabled: !!serverConnection && !!currentToken,
  });

  // Check which sections are cached
  useEffect(() => {
    const checkCachedSections = async () => {
      const cached = new Set<string>();
      const allSections = await db.librarySections.toArray();
      allSections.forEach((section) => {
        cached.add(section.key);
      });
      setCachedSections(cached);
    };

    checkCachedSections();
  }, [sections]);

  const handleSelectLibrary = (library: { key: string; title: string; type: string }) => {
    selectLibrary(library);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400">
        <p className="text-sm">Failed to load libraries</p>
        <p className="text-xs mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        <p className="text-sm">No libraries found</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <h2 className="px-2 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Libraries
      </h2>
      <nav className="space-y-1">
        {sections.map((section) => {
          const isCached = cachedSections.has(section.key);
          
          return (
            <button
              key={section.key}
              onClick={() =>
                handleSelectLibrary({
                  key: section.key,
                  title: section.title,
                  type: section.type,
                })
              }
              className={`
                w-full flex items-center px-3 py-2 text-sm font-medium rounded-md
                transition-colors duration-150
                ${
                  selectedLibrary?.key === section.key
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              aria-current={selectedLibrary?.key === section.key ? 'page' : undefined}
            >
              <LibraryIcon type={section.type} className="mr-3 h-5 w-5 flex-shrink-0" />
              <span className="truncate flex-1 text-left">{section.title}</span>
              {/* Show cached badge when offline and section is cached */}
              {!isOnline && isCached && (
                <CachedDataBadge
                  isCached={true}
                  size="sm"
                  position="inline"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * LibraryIcon Component
 * Displays an icon based on library type
 */
function LibraryIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'artist':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      );
    case 'movie':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
          />
        </svg>
      );
    case 'show':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    case 'photo':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
      );
  }
}
