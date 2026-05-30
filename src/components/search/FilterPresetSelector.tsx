import { useState } from 'react';
import { FilterPreset } from '../../managers/SearchManager';

interface FilterPresetSelectorProps {
  presets: FilterPreset[];
  onSelectPreset: (preset: FilterPreset) => void;
  onDeletePreset: (presetId: string) => void;
  isLoading?: boolean;
}

/**
 * FilterPresetSelector Component
 * Allows users to select, manage, and delete saved filter presets
 */
export function FilterPresetSelector({
  presets,
  onSelectPreset,
  onDeletePreset,
  isLoading = false,
}: FilterPresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const handleSelectPreset = (preset: FilterPreset) => {
    setSelectedPresetId(preset.id);
    onSelectPreset(preset);
    setIsOpen(false);
  };

  const handleDeletePreset = (e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this preset?')) {
      onDeletePreset(presetId);
      if (selectedPresetId === presetId) {
        setSelectedPresetId(null);
      }
    }
  };

  if (presets.length === 0) {
    return null;
  }

  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
        disabled={isLoading}
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        <span>{selectedPreset ? selectedPreset.name : 'Filter Presets'}</span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="py-1">
              {presets.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  No saved presets
                </div>
              ) : (
                presets.map((preset) => (
                  <PresetItem
                    key={preset.id}
                    preset={preset}
                    isSelected={preset.id === selectedPresetId}
                    onSelect={() => handleSelectPreset(preset)}
                    onDelete={(e) => handleDeletePreset(e, preset.id)}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface PresetItemProps {
  preset: FilterPreset;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function PresetItem({ preset, isSelected, onSelect, onDelete }: PresetItemProps) {
  const filterCount = Object.keys(preset.criteria.filters).length;
  const createdDate = new Date(preset.createdAt).toLocaleDateString();

  return (
    <div
      className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
        isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''
      }`}
    >
      <button
        onClick={onSelect}
        className="flex-1 text-left flex items-center space-x-2"
      >
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {preset.name}
            </span>
            {isSelected && (
              <svg
                className="h-4 w-4 text-primary-600 dark:text-primary-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {filterCount} {filterCount === 1 ? 'filter' : 'filters'} • {createdDate}
          </div>
        </div>
      </button>

      <button
        onClick={onDelete}
        className="ml-2 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
        aria-label="Delete preset"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
