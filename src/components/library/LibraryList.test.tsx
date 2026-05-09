import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LibraryList } from './LibraryList';
import { useAppStore } from '@/store/appStore';
import * as LibraryManagerModule from '@/managers/LibraryManager';

// Mock modules
vi.mock('@/store/appStore');
vi.mock('@/managers/LibraryManager');
vi.mock('@/api/plexClient');

describe('LibraryList', () => {
  let queryClient: QueryClient;
  const mockSelectLibrary = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAppStore).mockReturnValue({
      serverConnection: { uri: 'http://localhost:32400' },
      currentToken: 'test-token',
      selectedLibrary: null,
      selectLibrary: mockSelectLibrary,
    } as any);

    mockSelectLibrary.mockClear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <LibraryList />
      </QueryClientProvider>
    );
  };

  it('should render loading state', () => {
    const mockGetLibrarySections = vi.fn(() => new Promise(() => {}));
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(document.querySelectorAll('.h-10.bg-gray-200')).toHaveLength(3);
  });

  it('should render library sections', async () => {
    const mockSections = [
      {
        key: '1',
        title: 'Music',
        type: 'artist',
        agent: 'tv.plex.agents.music',
        scanner: 'Plex Music',
        language: 'en',
        uuid: 'uuid-1',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
      },
      {
        key: '2',
        title: 'Movies',
        type: 'movie',
        agent: 'tv.plex.agents.movie',
        scanner: 'Plex Movie',
        language: 'en',
        uuid: 'uuid-2',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
      },
    ];

    const mockGetLibrarySections = vi.fn().mockResolvedValue(mockSections);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Music')).toBeInTheDocument();
      expect(screen.getByText('Movies')).toBeInTheDocument();
    });

    expect(screen.getByText('Libraries')).toBeInTheDocument();
  });

  it('should handle library selection', async () => {
    const mockSections = [
      {
        key: '1',
        title: 'Music',
        type: 'artist',
        agent: 'tv.plex.agents.music',
        scanner: 'Plex Music',
        language: 'en',
        uuid: 'uuid-1',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
      },
    ];

    const mockGetLibrarySections = vi.fn().mockResolvedValue(mockSections);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Music')).toBeInTheDocument();
    });

    const musicButton = screen.getByText('Music').closest('button');
    await userEvent.click(musicButton!);

    expect(mockSelectLibrary).toHaveBeenCalledWith({
      key: '1',
      title: 'Music',
      type: 'artist',
    });
  });

  it('should highlight selected library', async () => {
    const mockSections = [
      {
        key: '1',
        title: 'Music',
        type: 'artist',
        agent: 'tv.plex.agents.music',
        scanner: 'Plex Music',
        language: 'en',
        uuid: 'uuid-1',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
      },
      {
        key: '2',
        title: 'Movies',
        type: 'movie',
        agent: 'tv.plex.agents.movie',
        scanner: 'Plex Movie',
        language: 'en',
        uuid: 'uuid-2',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
      },
    ];

    vi.mocked(useAppStore).mockReturnValue({
      serverConnection: { uri: 'http://localhost:32400' },
      currentToken: 'test-token',
      selectedLibrary: { key: '1', title: 'Music', type: 'artist' },
      selectLibrary: mockSelectLibrary,
    } as any);

    const mockGetLibrarySections = vi.fn().mockResolvedValue(mockSections);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Music')).toBeInTheDocument();
    });

    const musicButton = screen.getByText('Music').closest('button');
    expect(musicButton).toHaveAttribute('aria-current', 'page');
    expect(musicButton).toHaveClass('bg-blue-100');
  });

  it('should render error state', async () => {
    const mockGetLibrarySections = vi.fn().mockRejectedValue(new Error('API Error'));
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Failed to load libraries')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should render empty state', async () => {
    const mockGetLibrarySections = vi.fn().mockResolvedValue([]);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No libraries found')).toBeInTheDocument();
    });
  });

  it('should not fetch when no server connection', () => {
    vi.mocked(useAppStore).mockReturnValue({
      serverConnection: null,
      currentToken: 'test-token',
      selectedLibrary: null,
      selectLibrary: mockSelectLibrary,
    } as any);

    const mockGetLibrarySections = vi.fn();
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    expect(mockGetLibrarySections).not.toHaveBeenCalled();
  });

  it('should not fetch when no token', () => {
    vi.mocked(useAppStore).mockReturnValue({
      serverConnection: { uri: 'http://localhost:32400' },
      currentToken: null,
      selectedLibrary: null,
      selectLibrary: mockSelectLibrary,
    } as any);

    const mockGetLibrarySections = vi.fn();
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    expect(mockGetLibrarySections).not.toHaveBeenCalled();
  });

  it('should render correct icon for music library', async () => {
    const mockSections = [
      {
        key: '1',
        title: 'Music',
        type: 'artist',
        agent: 'tv.plex.agents.music',
        scanner: 'Plex Music',
        language: 'en',
        uuid: 'uuid-1',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
      },
    ];

    const mockGetLibrarySections = vi.fn().mockResolvedValue(mockSections);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Music')).toBeInTheDocument();
    });

    const musicButton = screen.getByText('Music').closest('button');
    const icon = musicButton?.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render correct icon for movie library', async () => {
    const mockSections = [
      {
        key: '2',
        title: 'Movies',
        type: 'movie',
        agent: 'tv.plex.agents.movie',
        scanner: 'Plex Movie',
        language: 'en',
        uuid: 'uuid-2',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
      },
    ];

    const mockGetLibrarySections = vi.fn().mockResolvedValue(mockSections);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Movies')).toBeInTheDocument();
    });

    const moviesButton = screen.getByText('Movies').closest('button');
    const icon = moviesButton?.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should render correct icon for TV library', async () => {
    const mockSections = [
      {
        key: '3',
        title: 'TV Shows',
        type: 'show',
        agent: 'tv.plex.agents.series',
        scanner: 'Plex Series',
        language: 'en',
        uuid: 'uuid-3',
        updatedAt: 1234567890,
        createdAt: 1234567890,
        scannedAt: 1234567890,
        content: true,
        directory: true,
        contentChangedAt: 1234567890,
        hidden: 0,
      },
    ];

    const mockGetLibrarySections = vi.fn().mockResolvedValue(mockSections);
    vi.spyOn(LibraryManagerModule, 'createLibraryManager').mockReturnValue({
      getLibrarySections: mockGetLibrarySections,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('TV Shows')).toBeInTheDocument();
    });

    const tvButton = screen.getByText('TV Shows').closest('button');
    const icon = tvButton?.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
