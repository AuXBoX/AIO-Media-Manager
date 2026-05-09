# Match Components

This directory contains components for viewing and selecting metadata match candidates from Plex's matching system.

## Components

### MatchCandidatesModal

Main modal for displaying match candidates and handling match/unmatch operations.

**Features:**
- Displays list of match candidates from Plex's matching API
- Shows confidence scores with color-coded progress bars
- Highlights best match candidate
- Supports match selection and unmatch functionality
- Loading and error states
- Success feedback

**Props:**
- `isOpen`: boolean - Controls modal visibility
- `onClose`: () => void - Close handler
- `ratingKey`: string - Plex rating key for the item
- `mediaType`: MediaType - Type of media (movie, show, etc.)
- `currentTitle`: string (optional) - Current item title
- `candidates`: MatchCandidate[] - Array of match candidates
- `isLoading`: boolean - Loading state
- `onMatch`: (guid: string) => Promise<void> - Match handler
- `onUnmatch`: () => Promise<void> - Unmatch handler
- `error`: string | null (optional) - Error message

**Usage:**
```tsx
import { MatchCandidatesModal } from '@/components/match';

<MatchCandidatesModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  ratingKey="123"
  mediaType="movie"
  currentTitle="The Matrix"
  candidates={candidates}
  isLoading={false}
  onMatch={handleMatch}
  onUnmatch={handleUnmatch}
/>
```

### MatchCandidateCard

Individual candidate card component displaying match information.

**Features:**
- Displays thumbnail, title, year, and summary
- Shows confidence score with color-coded progress bar
- Highlights best match with badge
- Select button with loading state
- GUID information display

**Props:**
- `candidate`: MatchCandidate - Candidate data
- `isBestMatch`: boolean - Whether this is the best match
- `onSelect`: () => void - Selection handler
- `isSelecting`: boolean - Loading state for selection

**Confidence Score Colors:**
- Green (≥90%): High confidence match
- Yellow (70-89%): Medium confidence match
- Orange (<70%): Low confidence match

**Usage:**
```tsx
import { MatchCandidateCard } from '@/components/match';

<MatchCandidateCard
  candidate={candidate}
  isBestMatch={true}
  onSelect={() => handleSelect(candidate)}
  isSelecting={false}
/>
```

## Data Types

### MatchCandidate

```typescript
interface MatchCandidate {
  guid: string;           // Plex GUID for the match
  score: number;          // Confidence score (0-100)
  title: string;          // Match title
  year?: number;          // Release year
  thumb?: string;         // Thumbnail URL
  summary?: string;       // Description
}
```

## Integration

These components work with the MetadataManager:

```typescript
import { MetadataManager } from '@/managers/MetadataManager';

// Get match candidates
const candidates = await metadataManager.getMatchCandidates(ratingKey);

// Apply a match
await metadataManager.matchMetadata(ratingKey, guid);

// Unmatch an item
await metadataManager.unmatchMetadata(ratingKey);
```

## Testing

Comprehensive test coverage includes:
- Component rendering
- User interactions
- Loading and error states
- Match/unmatch operations
- Confidence score display
- Best match highlighting

Run tests:
```bash
npm test -- src/components/match
```
