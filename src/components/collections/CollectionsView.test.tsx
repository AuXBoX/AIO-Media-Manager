import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CollectionsView } from './CollectionsView';
import { PlexClient } from '@/api/plexClient';
import { CollectionManager } from '@/managers/CollectionManager';

// Mock CollectionManager
vi.mock('@/managers/CollectionManager');

describe('CollectionsView', () => {
  let mockClient: PlexClient;

  beforeEach(() => {
    mockClient = {} as PlexClient;
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    vi.mocked(CollectionManager.prototype.getCollections).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(
      <CollectionsView
        sectionId="1"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render collections when loaded', async () => {
    const mockCollections = [
      {
        ratingKey: '1',
        key: '/library/collections/1',
        title: 'Marvel Movies',
        childCount: 25,
        addedAt: 1609459200,
        updatedAt: 1609459200,
        type: 'collection',
      },
      {
        ratingKey: '2',
        key: '/library/collections/2',
        title: 'DC Movies',
        childCount: 15,
        addedAt: 1609459200,
        updatedAt: 1609459200,
        type: 'collection',
      },
    ];

    vi.mocked(CollectionManager.prototype.getCollections).mockResolvedValue(mockCollections);

    render(
      <CollectionsView
        sectionId="1"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Marvel Movies')).toBeInTheDocument();
      expect(screen.getByText('DC Movies')).toBeInTheDocument();
    });

    expect(screen.getByText('25 items')).toBeInTheDocument();
    expect(screen.getByText('15 items')).toBeInTheDocument();
  });

  it('should render empty state when no collections', async () => {
    vi.mocked(CollectionManager.prototype.getCollections).mockResolvedValue([]);

    render(
      <CollectionsView
        sectionId="1"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No collections yet')).toBeInTheDocument();
    });
  });

  it('should render error state on failure', async () => {
    vi.mocked(CollectionManager.prototype.getCollections).mockRejectedValue(
      new Error('Failed to load')
    );

    render(
      <CollectionsView
        sectionId="1"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  it('should call onCollectionClick when collection is clicked', async () => {
    const mockCollections = [
      {
        ratingKey: '1',
        key: '/library/collections/1',
        title: 'Marvel Movies',
        childCount: 25,
        addedAt: 1609459200,
        updatedAt: 1609459200,
        type: 'collection',
      },
    ];

    vi.mocked(CollectionManager.prototype.getCollections).mockResolvedValue(mockCollections);

    const onCollectionClick = vi.fn();

    render(
      <CollectionsView
        sectionId="1"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onCollectionClick={onCollectionClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Marvel Movies')).toBeInTheDocument();
    });

    screen.getByText('Marvel Movies').click();

    expect(onCollectionClick).toHaveBeenCalledWith(mockCollections[0]);
  });

  it('should call onCreateCollection when create button is clicked', async () => {
    vi.mocked(CollectionManager.prototype.getCollections).mockResolvedValue([]);

    const onCreateCollection = vi.fn();

    render(
      <CollectionsView
        sectionId="1"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
        onCreateCollection={onCreateCollection}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No collections yet')).toBeInTheDocument();
    });

    const createButton = screen.getByText('Create Collection');
    createButton.click();

    expect(onCreateCollection).toHaveBeenCalled();
  });

  it('should display collection thumbnails when available', async () => {
    const mockCollections = [
      {
        ratingKey: '1',
        key: '/library/collections/1',
        title: 'Marvel Movies',
        thumb: '/library/collections/1/thumb',
        childCount: 25,
        addedAt: 1609459200,
        updatedAt: 1609459200,
        type: 'collection',
      },
    ];

    vi.mocked(CollectionManager.prototype.getCollections).mockResolvedValue(mockCollections);

    render(
      <CollectionsView
        sectionId="1"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      const img = screen.getByAltText('Marvel Movies');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        'src',
        'http://localhost:32400/library/collections/1/thumb?X-Plex-Token=test-token'
      );
    });
  });

  it('should reload collections when sectionId changes', async () => {
    const mockCollections1 = [
      {
        ratingKey: '1',
        key: '/library/collections/1',
        title: 'Collection 1',
        childCount: 10,
        addedAt: 1609459200,
        updatedAt: 1609459200,
        type: 'collection',
      },
    ];

    const mockCollections2 = [
      {
        ratingKey: '2',
        key: '/library/collections/2',
        title: 'Collection 2',
        childCount: 20,
        addedAt: 1609459200,
        updatedAt: 1609459200,
        type: 'collection',
      },
    ];

    vi.mocked(CollectionManager.prototype.getCollections)
      .mockResolvedValueOnce(mockCollections1)
      .mockResolvedValueOnce(mockCollections2);

    const { rerender } = render(
      <CollectionsView
        sectionId="1"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Collection 1')).toBeInTheDocument();
    });

    rerender(
      <CollectionsView
        sectionId="2"
        client={mockClient}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Collection 2')).toBeInTheDocument();
    });

    expect(CollectionManager.prototype.getCollections).toHaveBeenCalledTimes(2);
  });
});
