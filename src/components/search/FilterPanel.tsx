import { useState } from 'react';
import { LibraryFilter } from '../../managers/LibraryManager';

interface FilterPanelProps {
  filters: LibraryFilter[];
  activeFilters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  onApply: () => void;
  onClear: () => void;
  onSavePreset?: () => void;
}

/**
 * FilterPanel Component
 * Advanced filtering panel with multiple filter options
 */
export function FilterPanel({
  filters,
  activeFilters,
  onFilterChange,
  onApply,
  onClear,
  onSavePreset,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key] !== undefined && activeFilters[key] !== ''
  ).length;

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...activeFilters };
    
    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    onFilterChange(newFilters);
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="px-6 py-3">
        {/* Header */}
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
            <span>Advanced Filters</span>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <button
                onClick={onClear}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
              >
                Clear
              </button>
            )}
            {onSavePreset && activeFilterCount > 0 && (
              <button
                onClick={onSavePreset}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Save Preset
              </button>
            )}
          </div>
        </div>

        {/* Filter Options */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filters.map((filter) => (
                <FilterField
                  key={filter.key}
                  filter={filter}
                  value={activeFilters[filter.key]}
                  onChange={(value) => handleFilterChange(filter.key, value)}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClear}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Clear All
              </button>
              <button
                onClick={onApply}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterFieldProps {
  filter: LibraryFilter;
  value: any;
  onChange: (value: any) => void;
}

function FilterField({ filter, value, onChange }: FilterFieldProps) {
  const inputId = `filter-${filter.key}`;
  
  const renderInput = () => {
    switch (filter.type) {
      case 'string':
        return (
          <input
            id={inputId}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder={`Enter ${filter.title.toLowerCase()}`}
          />
        );

      case 'integer':
      case 'number':
        return (
          <input
            id={inputId}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder={`Enter ${filter.title.toLowerCase()}`}
          />
        );

      case 'boolean':
        return (
          <select
            id={inputId}
            value={value === undefined ? '' : value ? 'true' : 'false'}
            onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      case 'tag':
        if (filter.values && filter.values.length > 0) {
          return (
            <select
              id={inputId}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">All</option>
              {filter.values.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.title}
                  {option.count !== undefined && ` (${option.count})`}
                </option>
              ))}
            </select>
          );
        }
        return (
          <input
            id={inputId}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder={`Enter ${filter.title.toLowerCase()}`}
          />
        );

      case 'date':
        return (
          <input
            id={inputId}
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        );

      default:
        return (
          <input
            id={inputId}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        );
    }
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {filter.title}
      </label>
      {renderInput()}
    </div>
  );
}
