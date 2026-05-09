# External Metadata Search Components

This directory contains components for searching external metadata providers (TMDB, IMDB, MusicBrainz) and importing metadata into Plex.

## Components

### ExternalSearchModal

Main modal component for external metadata search and import workflow.

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal is closed
- `providerRegistry: ProviderRegistry` - Provider registry instance
- `ratingKey: string` - Plex item rating key to update
- `mediaType: MediaType` - Type of media (movie, show, artist, etc.)
- `currentTitle?: string` - Pre-fill search with current title
- `currentYear?: number` - Pre-fill year filter

**Features:**
- Provider selection (TMDB, IMDB, MusicBrainz)
- Search with query and optional year filter
- Display search results
- Preview full metadata before import
- Import metadata to Plex
- Error handling and success feedback

**Usage:**
```tsx
import { ExternalSearchModal } from '@/components/external';
import { createProviderRegistry } from '@/providers/ProviderRegistry';

const providerRegistry = createProviderRegistry(plexClient, {
  tmdb: { apiKey: 'your-api-key' },
});

<ExternalSearchModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  providerRegistry={providerRegistry}
  ratingKey="12345"
  mediaType="movie"
  currentTitle="The Matrix"
  currentYear={1999}
/>
```

### SearchResults

Displays search results from external metadata providers.

**Props:**
- `results: SearchResult[]` - Array of search results
- `isLoading: boolean` - Loading state
- `onResultSelect: (result: SearchResult) => void` - Callback when result is selected

**Features:**
- Grid display of results with thumbnails
- Shows title, year, summary
- Provider badges
- Loading and empty states

### MetadataPreview

Displays full metadata preview before importing.

**Props:**
- `metadata: ExternalMetadata | null` - Metadata to preview
- `isLoading: boolean` - Loading state
- `onImport: () => void` - Callback to import metadata
- `isImporting: boolean` - Import in progress state

**Features:**
- Full metadata display (title, year, rating, genres, etc.)
- Cast and crew information with photos
- Multiple posters and backdrops
- Import confirmation button
- Loading and empty states

## Workflow

1. User opens ExternalSearchModal
2. User selects provider (TMDB, IMDB, or MusicBrainz)
3. User enters search query and optional year
4. SearchResults displays matching items
5. User selects a result
6. MetadataPreview shows full metadata
7. User confirms and imports metadata
8. Modal shows success message and closes

## Testing

All components have comprehensive test coverage:
- `ExternalSearchModal.test.tsx` - 19 tests
- `SearchResults.test.tsx` - 9 tests
- `MetadataPreview.test.tsx` - 15 tests

Run tests:
```bash
npm test -- src/components/external
```

## Dependencies

- `@/providers/ProviderRegistry` - Provider management
- `@/types` - Type definitions
- React Query - For async state management (in parent components)
