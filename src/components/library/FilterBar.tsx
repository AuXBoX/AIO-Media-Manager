import { useState } from 'react';

export interface FilterOption {
  key: string;
  label: string;
  value: string;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterGroup[];
  activeFilters: Record<string, string>;
  onFilterChange: (filterKey: string, value: string) => void;
  onClearFilters: () => void;
}

/**
 * FilterBar Component
 * Displays filter options for library items
 */
export function FilterBar({ filters, activeFilters, onFilterChange, onClearFilters }: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key] !== ''
  ).length;

  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <svg
              className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100">
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={onClearFilters}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Clear all
            </button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filters.map((filterGroup) => (
              <div key={filterGroup.key}>
                <label
                  htmlFor={`filter-${filterGroup.key}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  {filterGroup.label}
                </label>
                <select
                  id={`filter-${filterGroup.key}`}
                  value={activeFilters[filterGroup.key] || ''}
                  onChange={(e) => onFilterChange(filterGroup.key, e.target.value)}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All</option>
                  {filterGroup.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
