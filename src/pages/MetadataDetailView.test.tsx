import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MetadataDetailView } from './MetadataDetailView';
import { PlexClient } from '@/api/plexClient';

// Mock PlexClient
vi.mock('@/api/plexClient');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('MetadataDetailView', () => {
  let queryClient: QueryClient;
  let mockClient: PlexClient;

  const mockMetadata = {
    ratingKey: '123',
    key: '/library/metadata/123',
    guid: 'plex://movie/123',
    type: 'movie',
    title: 'Test Movie',
    originalTitle: 'Original Test Movie',
    summary: 'A test movie summary',
    tagline: 'A great tagline',
    rating: 8.5,
    year: 2020,
    thumb: '/library/metadata/123/thumb',
    art: '/library/metadata/123/art',
    duration: 7200000,
    addedAt: 1609459200,
    updatedAt: 1609459200,
    studio: 'Test Studio',
    contentRating: 'PG-13',
    genres: [{ tag: 'Action' }, { tag: 'Drama' }],
    roles: [{ tag: 'Actor 1', role: 'Character 1' }],
    directors: [{ tag: 'Director 1' }],
    writers: [{ tag: 'Writer 1' }],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockClient = {
      get: vi.fn(),
      put: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
    } as any;

    mockNavigate.mockClear();
  });

  const renderComponent = (ratingKey = '123') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/metadata/${ratingKey}`]}>
          <Routes>
            <Route
              path="/metadata/:ratingKey"
              element={<MetadataDetailView client={mockClient} />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('should display loading state', () => {
    vi.mocked(mockClient.get).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderComponent();

    expect(screen.getByText('Loading metadata...')).toBeInTheDocument();
  });

  it('should display metadata details', async () => {
    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [mockMetadata],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    });

    expect(screen.getByText('movie • 2020')).toBeInTheDocument();
    expect(screen.getByText('Original Test Movie')).toBeInTheDocument();
    expect(screen.getByText('A test movie summary')).toBeInTheDocument();
    expect(screen.getByText('A great tagline')).toBeInTheDocument();
    expect(screen.getByText('Test Studio')).toBeInTheDocument();
    expect(screen.getByText('PG-13')).toBeInTheDocument();
    expect(screen.getByText('8.5/10')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
  });

  it('should display error state', async () => {
    vi.mocked(mockClient.get).mockRejectedValue(new Error('Failed to load metadata'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Error Loading Metadata')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to load metadata')).toBeInTheDocument();
  });

  it('should display not found state', async () => {
    vi.mocked(mockClient.get).mockRejectedValue(new Error('Metadata not found for ratingKey: 123'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Error Loading Metadata')).toBeInTheDocument();
    });

    expect(screen.getByText('Metadata not found for ratingKey: 123')).toBeInTheDocument();
  });

  it('should navigate back when back button is clicked', async () => {
    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [mockMetadata],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    });

    const backButton = screen.getByLabelText('Go back');
    await userEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should enter edit mode when edit button is clicked', async () => {
    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [mockMetadata],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    });

    const editButton = screen.getByRole('button', { name: 'Edit' });
    await userEvent.click(editButton);

    // Should show Save and Cancel buttons
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

    // Should show input fields
    const titleInput = screen.getByDisplayValue('Test Movie');
    expect(titleInput).toBeInTheDocument();
    expect(titleInput.tagName).toBe('INPUT');
  });

  it('should cancel edit mode when cancel button is clicked', async () => {
    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [mockMetadata],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: 'Edit' });
    await userEvent.click(editButton);

    // Cancel edit
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await userEvent.click(cancelButton);

    // Should show Edit button again
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('should save changes when save button is clicked', async () => {
    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [mockMetadata],
      },
    });

    vi.mocked(mockClient.put).mockResolvedValue({});

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: 'Edit' });
    await userEvent.click(editButton);

    // Edit title
    const titleInput = screen.getByDisplayValue('Test Movie');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Updated Movie');

    // Save changes
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            title: 'Updated Movie',
          }),
        })
      );
    });
  });

  it('should refresh metadata when refresh button is clicked', async () => {
    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [mockMetadata],
      },
    });

    vi.mocked(mockClient.put).mockResolvedValue({});

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    await userEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockClient.put).toHaveBeenCalledWith('/library/metadata/123/refresh');
    });
  });

  it('should display artwork', async () => {
    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [mockMetadata],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    });

    const artwork = screen.getByAltText('Test Movie');
    expect(artwork).toBeInTheDocument();
    expect(artwork).toHaveAttribute('src', '/library/metadata/123/thumb');
  });

  it('should display placeholder when no artwork', async () => {
    const metadataWithoutArtwork = { ...mockMetadata, thumb: undefined };

    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [metadataWithoutArtwork],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    });

    expect(screen.getByText('🎬')).toBeInTheDocument();
  });

  it('should handle genre editing', async () => {
    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [mockMetadata],
      },
    });

    vi.mocked(mockClient.put).mockResolvedValue({});

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
    });

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: 'Edit' });
    await userEvent.click(editButton);

    // Edit genres
    const genresInput = screen.getByPlaceholderText('Action, Drama, Thriller');
    await userEvent.clear(genresInput);
    await userEvent.type(genresInput, 'Action, Comedy, Thriller');

    // Save changes
    const saveButton = screen.getByRole('button', { name: 'Save' });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockClient.put).toHaveBeenCalledWith(
        '/library/metadata/123',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            'genre[0].tag.tag': 'Action',
            'genre[1].tag.tag': 'Comedy',
            'genre[2].tag.tag': 'Thriller',
          }),
        })
      );
    });
  });

  it('should display missing fields as dash', async () => {
    const minimalMetadata = {
      ratingKey: '123',
      key: '/library/metadata/123',
      guid: 'plex://movie/123',
      type: 'movie',
      title: 'Minimal Movie',
      addedAt: 1609459200,
      updatedAt: 1609459200,
    };

    vi.mocked(mockClient.get).mockResolvedValue({
      MediaContainer: {
        Metadata: [minimalMetadata],
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Minimal Movie' })).toBeInTheDocument();
    });

    // Check for dashes in missing fields
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });
});
