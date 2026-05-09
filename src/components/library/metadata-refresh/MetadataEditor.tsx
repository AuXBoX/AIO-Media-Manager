import { useState } from 'react';
import type { EditableMetadata } from '@/types/metadata-refresh';

interface MetadataEditorProps {
  metadata: EditableMetadata;
  originalMetadata: EditableMetadata;
  onChange: (metadata: EditableMetadata) => void;
}

/**
 * MetadataEditor Component
 * 
 * Inline editing for all metadata fields with change indicators
 */
export function MetadataEditor({
  metadata,
  originalMetadata,
  onChange,
}: MetadataEditorProps) {
  const [genreInput, setGenreInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const hasChanged = (field: keyof EditableMetadata): boolean => {
    return JSON.stringify(metadata[field]) !== JSON.stringify(originalMetadata[field]);
  };

  const handleAddGenre = () => {
    if (genreInput.trim() && !metadata.genres.includes(genreInput.trim())) {
      onChange({
        ...metadata,
        genres: [...metadata.genres, genreInput.trim()],
      });
      setGenreInput('');
    }
  };

  const handleRemoveGenre = (genre: string) => {
    onChange({
      ...metadata,
      genres: metadata.genres.filter((g) => g !== genre),
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      onChange({
        ...metadata,
        tags: [...metadata.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    onChange({
      ...metadata,
      tags: metadata.tags.filter((t) => t !== tag),
    });
  };

  const handleArrayFieldChange = (
    field: 'directors' | 'writers' | 'producers',
    index: number,
    value: string
  ) => {
    const newArray = [...metadata[field]];
    newArray[index] = value;
    onChange({ ...metadata, [field]: newArray });
  };

  const handleAddArrayField = (field: 'directors' | 'writers' | 'producers') => {
    onChange({
      ...metadata,
      [field]: [...metadata[field], ''],
    });
  };

  const handleRemoveArrayField = (
    field: 'directors' | 'writers' | 'producers',
    index: number
  ) => {
    onChange({
      ...metadata,
      [field]: metadata[field].filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Title {hasChanged('title') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
          </label>
          <input
            type="text"
            value={metadata.title}
            onChange={(e) => onChange({ ...metadata, title: e.target.value })}
            className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
        </div>

        {/* Original Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Original Title {hasChanged('originalTitle') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
          </label>
          <input
            type="text"
            value={metadata.originalTitle || ''}
            onChange={(e) => onChange({ ...metadata, originalTitle: e.target.value })}
            placeholder="Same as title if not specified"
            className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
        </div>

        {/* Year */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Year {hasChanged('year') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
          </label>
          <input
            type="number"
            value={metadata.year || ''}
            onChange={(e) => onChange({ ...metadata, year: parseInt(e.target.value) || undefined })}
            min="1800"
            max="2100"
            className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
        </div>

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Rating (0-10) {hasChanged('rating') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
          </label>
          <input
            type="number"
            value={metadata.rating || ''}
            onChange={(e) => onChange({ ...metadata, rating: parseFloat(e.target.value) || undefined })}
            min="0"
            max="10"
            step="0.1"
            className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
        </div>

        {/* Content Rating */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Content Rating {hasChanged('contentRating') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
          </label>
          <input
            type="text"
            value={metadata.contentRating || ''}
            onChange={(e) => onChange({ ...metadata, contentRating: e.target.value })}
            placeholder="e.g., PG-13, R, TV-14"
            className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
        </div>

        {/* Studio */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Studio {hasChanged('studio') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
          </label>
          <input
            type="text"
            value={metadata.studio || ''}
            onChange={(e) => onChange({ ...metadata, studio: e.target.value })}
            className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
        </div>

        {/* Tagline */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Tagline {hasChanged('tagline') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
          </label>
          <input
            type="text"
            value={metadata.tagline || ''}
            onChange={(e) => onChange({ ...metadata, tagline: e.target.value })}
            className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
        </div>

        {/* Summary */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Summary {hasChanged('summary') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
          </label>
          <textarea
            value={metadata.summary || ''}
            onChange={(e) => onChange({ ...metadata, summary: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
        </div>
      </div>

      {/* Genres */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Genres {hasChanged('genres') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {metadata.genres.map((genre) => (
            <span
              key={genre}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
            >
              {genre}
              <button
                onClick={() => handleRemoveGenre(genre)}
                className="hover:text-primary-900 dark:hover:text-primary-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={genreInput}
            onChange={(e) => setGenreInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddGenre()}
            placeholder="Add genre..."
            className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
          <button
            onClick={handleAddGenre}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Tags {hasChanged('tags') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 rounded-full text-sm"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-secondary-900 dark:hover:text-secondary-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            placeholder="Add tag..."
            className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
          />
          <button
            onClick={handleAddTag}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Directors */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Directors {hasChanged('directors') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
        </label>
        <div className="space-y-2">
          {metadata.directors.map((director, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={director}
                onChange={(e) => handleArrayFieldChange('directors', index, e.target.value)}
                placeholder="Director name"
                className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
              />
              <button
                onClick={() => handleRemoveArrayField('directors', index)}
                className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => handleAddArrayField('directors')}
            className="w-full px-3 py-2 border-2 border-dashed border-secondary-300 dark:border-secondary-600 rounded-md text-secondary-600 dark:text-secondary-400 hover:border-secondary-400 dark:hover:border-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
          >
            + Add Director
          </button>
        </div>
      </div>

      {/* Writers */}
      <div>
        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
          Writers {hasChanged('writers') && <span className="text-green-600 dark:text-green-400">✓ Changed</span>}
        </label>
        <div className="space-y-2">
          {metadata.writers.map((writer, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={writer}
                onChange={(e) => handleArrayFieldChange('writers', index, e.target.value)}
                placeholder="Writer name"
                className="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-900 text-secondary-900 dark:text-secondary-50"
              />
              <button
                onClick={() => handleRemoveArrayField('writers', index)}
                className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
          <button
            onClick={() => handleAddArrayField('writers')}
            className="w-full px-3 py-2 border-2 border-dashed border-secondary-300 dark:border-secondary-600 rounded-md text-secondary-600 dark:text-secondary-400 hover:border-secondary-400 dark:hover:border-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
          >
            + Add Writer
          </button>
        </div>
      </div>
    </div>
  );
}
