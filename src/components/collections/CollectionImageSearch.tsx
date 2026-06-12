import { Collection } from '@/managers/CollectionManager';
import type { LibraryItem } from '@/managers/LibraryManager';
import { ImageSearchModal } from '@/components/library/ImageSearchModal';

interface CollectionImageSearchProps {
  collection: Collection;
  serverUrl: string;
  token: string;
  onClose: () => void;
  onImageUpdated: () => void;
}

/**
 * CollectionImageSearch Adapter
 * Searches TMDB collections (franchises) by the collection name,
 * then fetches and applies artwork to the Plex collection.
 */
export function CollectionImageSearch({
  collection,
  serverUrl,
  token,
  onClose,
  onImageUpdated,
}: CollectionImageSearchProps) {
  // Build a LibraryItem shape with the collection title for searching.
  // The ratingKey is the collection's so the poster saves to the collection.
  const searchItem: LibraryItem = {
    ratingKey: collection.ratingKey,
    key: collection.key,
    guid: collection.guid || '',
    type: 'movie',
    title: collection.title,
    summary: collection.summary,
    thumb: collection.thumb,
    art: collection.art,
  };

  return (
    <ImageSearchModal
      item={searchItem}
      serverUrl={serverUrl}
      token={token}
      onClose={onClose}
      onImageSelected={onImageUpdated}
      isCollectionSearch
    />
  );
}
