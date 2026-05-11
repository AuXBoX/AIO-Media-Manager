import { useState, useCallback, useMemo } from 'react';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPlexClient } from '@/api/plexClient';
import { queryKeys } from '@/api/queryKeys';
import type { LibraryItem } from '@/managers/LibraryManager';

// Extend Window interface for debug flag
declare global {
  interface Window {
    __tvShowDebugLogged?: boolean;
  }
}

interface TVShowTreeViewProps {
  items: LibraryItem[];
  serverUrl: string;
  token: string;
  onItemClick: (item: LibraryItem) => void;
  selectedItem: LibraryItem | null;
  selectedItems: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  getCacheStatus: (ratingKey: string) => { isCached: boolean; isDirty: boolean };
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
}

interface ShowNode {
  show: LibraryItem;
  seasons: LibraryItem[];
  isExpanded: boolean;
  isLoading: boolean;
}

interface SeasonNode {
  season: LibraryItem;
  episodes: LibraryItem[];
  isExpanded: boolean;
  isLoading: boolean;
}

export function TVShowTreeView({
  items,
  serverUrl,
  token,
  onItemClick,
  selectedItem,
  selectedItems,
  onSelectionChange,
  getCacheStatus,
  onScroll,
}: TVShowTreeViewProps) {
  // Track expanded state and loaded data
  const [expandedShows, setExpandedShows] = useState<Set<string>>(new Set());
  const [expandedSeasons, setExpandedSeasons] = useState<Set<string>>(new Set());
  const [showSeasons, setShowSeasons] = useState<Map<string, LibraryItem[]>>(new Map());
  const [seasonEpisodes, setSeasonEpisodes] = useState<Map<string, LibraryItem[]>>(new Map());
  const [loadingShows, setLoadingShows] = useState<Set<string>>(new Set());
  const [loadingSeasons, setLoadingSeasons] = useState<Set<string>>(new Set());

  const client = useMemo(() => createPlexClient({ baseURL: serverUrl, token }), [serverUrl, token]);

  // Fetch seasons for a show
  const fetchSeasons = useCallback(async (showKey: string) => {
    if (showSeasons.has(showKey)) return; // Already loaded
    
    console.log('[TVShowTreeView] Fetching seasons for show:', showKey);
    setLoadingShows((prev) => new Set(prev).add(showKey));
    
    try {
      const response = await client.get(`/library/metadata/${showKey}/children`);
      const seasons = response.MediaContainer?.Metadata || [];
      console.log('[TVShowTreeView] Fetched seasons:', seasons.length, seasons);
      setShowSeasons((prev) => new Map(prev).set(showKey, seasons));
    } catch (error) {
      console.error('[TVShowTreeView] Failed to fetch seasons:', error);
    } finally {
      setLoadingShows((prev) => {
        const next = new Set(prev);
        next.delete(showKey);
        return next;
      });
    }
  }, [client, showSeasons]);

  // Fetch episodes for a season
  const fetchEpisodes = useCallback(async (seasonKey: string) => {
    if (seasonEpisodes.has(seasonKey)) return; // Already loaded
    
    console.log('[TVShowTreeView] Fetching episodes for season:', seasonKey);
    setLoadingSeasons((prev) => new Set(prev).add(seasonKey));
    
    try {
      const response = await client.get(`/library/metadata/${seasonKey}/children`);
      const episodes = response.MediaContainer?.Metadata || [];
      console.log('[TVShowTreeView] Fetched episodes:', episodes.length, episodes);
      setSeasonEpisodes((prev) => new Map(prev).set(seasonKey, episodes));
    } catch (error) {
      console.error('[TVShowTreeView] Failed to fetch episodes:', error);
    } finally {
      setLoadingSeasons((prev) => {
        const next = new Set(prev);
        next.delete(seasonKey);
        return next;
      });
    }
  }, [client, seasonEpisodes]);

  const toggleShow = useCallback((showKey: string) => {
    const isExpanding = !expandedShows.has(showKey);
    
    setExpandedShows((prev) => {
      const next = new Set(prev);
      if (next.has(showKey)) {
        next.delete(showKey);
      } else {
        next.add(showKey);
      }
      return next;
    });

    // Fetch seasons if expanding and not already loaded
    if (isExpanding) {
      fetchSeasons(showKey);
    }
  }, [expandedShows, fetchSeasons]);

  const toggleSeason = useCallback((seasonKey: string) => {
    const isExpanding = !expandedSeasons.has(seasonKey);
    
    setExpandedSeasons((prev) => {
      const next = new Set(prev);
      if (next.has(seasonKey)) {
        next.delete(seasonKey);
      } else {
        next.add(seasonKey);
      }
      return next;
    });

    // Fetch episodes if expanding and not already loaded
    if (isExpanding) {
      fetchEpisodes(seasonKey);
    }
  }, [expandedSeasons, fetchEpisodes]);

  const handleCheckboxChange = useCallback((ratingKey: string, checked: boolean) => {
    const next = new Set(selectedItems);
    if (checked) {
      next.add(ratingKey);
    } else {
      next.delete(ratingKey);
    }
    onSelectionChange(next);
  }, [selectedItems, onSelectionChange]);

  const getStatusIcon = (item: LibraryItem) => {
    const status = getCacheStatus(item.ratingKey);
    if (status.isDirty) {
      return (
        <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    if (status.isCached) {
      return (
        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    return null;
  };

  // Filter to only show items
  const shows = items.filter((item) => item.type === 'show').sort((a, b) => 
    (a.titleSort || a.title).localeCompare(b.titleSort || b.title)
  );

  // Debug: Log first show to see data structure
  if (shows.length > 0 && !window.__tvShowDebugLogged) {
    console.log('[TVShowTreeView] First show data:', shows[0]);
    window.__tvShowDebugLogged = true;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex-1 overflow-auto" onScroll={onScroll}>
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
            <tr>
              <th className="w-8 px-2 py-3"></th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Title
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                S
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                E
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {shows.map((show) => {
            const isShowExpanded = expandedShows.has(show.ratingKey);
            const seasons = showSeasons.get(show.ratingKey) || [];
            const isLoadingShow = loadingShows.has(show.ratingKey);
            
            // Calculate counts
            const seasonCount = show.childCount || seasons.length || 0;
            const episodeCount = show.leafCount || 0;

            return (
              <React.Fragment key={show.ratingKey}>
                {/* Show Row */}
                <tr
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                    selectedItem?.ratingKey === show.ratingKey
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : ''
                  }`}
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(show.ratingKey)}
                      onChange={(e) => handleCheckboxChange(show.ratingKey, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleShow(show.ratingKey);
                        }}
                        className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {isLoadingShow ? '⋯' : isShowExpanded ? '▼' : '▶'}
                      </button>
                      <span
                        onClick={() => onItemClick(show)}
                        className="font-medium text-gray-900 dark:text-gray-100"
                      >
                        {show.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    {seasonCount}
                  </td>
                  <td className="px-4 py-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    {episodeCount}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {getStatusIcon(show)}
                  </td>
                </tr>

                {/* Season Rows */}
                {isShowExpanded &&
                  seasons
                    .sort((a, b) => (a.index || 0) - (b.index || 0))
                    .map((season) => {
                      const isSeasonExpanded = expandedSeasons.has(season.ratingKey);
                      const episodes = seasonEpisodes.get(season.ratingKey) || [];
                      const isLoadingSeason = loadingSeasons.has(season.ratingKey);
                      const episodeCount = season.leafCount || episodes.length || 0;

                      return (
                        <React.Fragment key={season.ratingKey}>
                          {/* Season Row */}
                          <tr
                            className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                              selectedItem?.ratingKey === season.ratingKey
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : ''
                            }`}
                          >
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={selectedItems.has(season.ratingKey)}
                                onChange={(e) =>
                                  handleCheckboxChange(season.ratingKey, e.target.checked)
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-gray-300 dark:border-gray-600"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2 pl-6">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSeason(season.ratingKey);
                                  }}
                                  className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                  {isLoadingSeason ? '⋯' : isSeasonExpanded ? '▼' : '▶'}
                                </button>
                                <span
                                  onClick={() => onItemClick(season)}
                                  className="text-gray-700 dark:text-gray-300"
                                >
                                  {season.title || `Season ${season.index}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                            <td className="px-4 py-2 text-center text-sm text-gray-600 dark:text-gray-400">
                              {episodeCount}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {getStatusIcon(season)}
                            </td>
                          </tr>

                          {/* Episode Rows */}
                          {isSeasonExpanded &&
                            episodes
                              .sort((a, b) => (a.index || 0) - (b.index || 0))
                              .map((episode) => (
                                <tr
                                  key={episode.ratingKey}
                                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                                    selectedItem?.ratingKey === episode.ratingKey
                                      ? 'bg-blue-50 dark:bg-blue-900/20'
                                      : ''
                                  }`}
                                  onClick={() => onItemClick(episode)}
                                >
                                  <td className="px-2 py-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedItems.has(episode.ratingKey)}
                                      onChange={(e) =>
                                        handleCheckboxChange(episode.ratingKey, e.target.checked)
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      className="rounded border-gray-300 dark:border-gray-600"
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="pl-12 text-sm text-gray-600 dark:text-gray-400">
                                      {episode.index}. {episode.title}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                                  <td className="px-4 py-2 text-center text-sm text-gray-600 dark:text-gray-400"></td>
                                  <td className="px-4 py-2 text-center">
                                    {getStatusIcon(episode)}
                                  </td>
                                </tr>
                              ))}
                        </React.Fragment>
                      );
                    })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
    </div>
  );
}
