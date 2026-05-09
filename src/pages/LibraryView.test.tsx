import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LibraryView } from './LibraryView';
import { useAppStore } from '@/store/appStore';
import * as LibraryManagerModule from '@/managers/LibraryManager';

// Mock modules
vi.mock('@/store/appStore');
vi.mock('@/managers/LibraryManager');
vi.mock('@/api/plexClient');

describe('LibraryView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAppStore).mockReturnValue({
      serverConnection: { uri: 'http://localhost:32400' },
      currentToken: 'test-token',
      selectedLibrary: { key: '1', title: 'Music', type: 'artist' },
    } as any);
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <LibraryView />
      </QueryClientProvider>
    );
  };

  it('should render no library selected state', () => {
    vi.mocked(useAppStore).mockReturnValue({
      serverConnection: { uri: 'http://localhost:32400' },
      currentToken: 'test-token',
      selectedLibrary: null,
    } as any);

    renderComponent();

    expect(screen.getByText('No library selected')).toBeInTheDocument();
    expect(screen.getByText('Select a library from the sidebar to get started')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    const mockGetLibraryItems = vi.fn(() => new Promise(() => {}));
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render library items in grid view', async () => {
    const mockItems = {
      items: [
        {
          ratingKey: '123',
          key: '/library/metadata/123',
          guid: 'plex://album/123',
          type: 'album',
          title: 'Album 1',
          year: 2020,
          thumb: '/library/metadata/123/thumb',
        },
        {
          ratingKey: '124',
          key: '/library/metadata/124',
          guid: 'plex://album/124',
          type: 'album',
          title: 'Album 2',
          year: 2021,
        },
      ],
      totalSize: 2,
      size: 2,
      offset: 0,
    };

    const mockGetLibraryItems = vi.fn().mockResolvedValue(mockItems);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Music')).toBeInTheDocument();
      expect(screen.getByText('2 items')).toBeInTheDocument();
      expect(screen.getByText('Album 1')).toBeInTheDocument();
      expect(screen.getByText('Album 2')).toBeInTheDocument();
    });
  });

  it('should switch between grid and list view', async () => {
    const mockItems = {
      items: [
        {
          ratingKey: '123',
          key: '/library/metadata/123',
          guid: 'plex://album/123',
          type: 'album',
          title: 'Album 1',
        },
      ],
      totalSize: 1,
      size: 1,
      offset: 0,
    };

    const mockGetLibraryItems = vi.fn().mockResolvedValue(mockItems);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Album 1')).toBeInTheDocument();
    });

    const listViewButton = screen.getByLabelText('List view');
    await userEvent.click(listViewButton);

    // List view should still show the item
    expect(screen.getByText('Album 1')).toBeInTheDocument();

    const gridViewButton = screen.getByLabelText('Grid view');
    await userEvent.click(gridViewButton);

    // Grid view should still show the item
    expect(screen.getByText('Album 1')).toBeInTheDocument();
  });

  it('should handle pagination', async () => {
    const mockItems = {
      items: Array.from({ length: 50 }, (_, i) => ({
        ratingKey: `${i}`,
        key: `/library/metadata/${i}`,
        guid: `plex://album/${i}`,
        type: 'album',
        title: `Album ${i}`,
      })),
      totalSize: 100,
      size: 50,
      offset: 0,
    };

    const mockGetLibraryItems = vi.fn().mockResolvedValue(mockItems);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Showing 1 to 50 of 100 items')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    expect(nextButton).not.toBeDisabled();

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();
  });

  it('should render error state', async () => {
    const mockGetLibraryItems = vi.fn().mockRejectedValue(new Error('API Error'));
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to load library')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should render empty state', async () => {
    const mockItems = {
      items: [],
      totalSize: 0,
      size: 0,
      offset: 0,
    };

    const mockGetLibraryItems = vi.fn().mockResolvedValue(mockItems);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('This library is empty')).toBeInTheDocument();
    });
  });

  it('should not fetch when no server connection', () => {
    vi.mocked(useAppStore).mockReturnValue({
      serverConnection: null,
      currentToken: 'test-token',
      selectedLibrary: { key: '1', title: 'Music', type: 'artist' },
    } as any);

    const mockGetLibraryItems = vi.fn();
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    expect(mockGetLibraryItems).not.toHaveBeenCalled();
  });

  it('should not fetch when no token', () => {
    vi.mocked(useAppStore).mockReturnValue({
      serverConnection: { uri: 'http://localhost:32400' },
      currentToken: null,
      selectedLibrary: { key: '1', title: 'Music', type: 'artist' },
    } as any);

    const mockGetLibraryItems = vi.fn();
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    expect(mockGetLibraryItems).not.toHaveBeenCalled();
  });

  it('should display item thumbnails when available', async () => {
    const mockItems = {
      items: [
        {
          ratingKey: '123',
          key: '/library/metadata/123',
          guid: 'plex://album/123',
          type: 'album',
          title: 'Album 1',
          thumb: '/library/metadata/123/thumb',
        },
      ],
      totalSize: 1,
      size: 1,
      offset: 0,
    };

    const mockGetLibraryItems = vi.fn().mockResolvedValue(mockItems);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    await waitFor(() => {
      const img = screen.getByAltText('Album 1');
      expect(img).toHaveAttribute(
        'src',
        'http://localhost:32400/library/metadata/123/thumb?X-Plex-Token=test-token'
      );
    });
  });

  it('should not show pagination for single page', async () => {
    const mockItems = {
      items: [
        {
          ratingKey: '123',
          key: '/library/metadata/123',
          guid: 'plex://album/123',
          type: 'album',
          title: 'Album 1',
        },
      ],
      totalSize: 1,
      size: 1,
      offset: 0,
    };

    const mockGetLibraryItems = vi.fn().mockResolvedValue(mockItems);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibraryItems: mockGetLibraryItems,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Album 1')).toBeInTheDocument();
    });

    expect(screen.queryByText('Previous')).not.toBeInTheDocument();
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });
});
