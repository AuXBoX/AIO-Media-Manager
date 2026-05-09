import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExternalSearchModal } from './ExternalSearchModal';
import { ProviderRegistry } from '@/providers/ProviderRegistry';
import { PlexClient } from '@/api/plexClient';
import { SearchResult, ExternalMetadata } from '@/types';

// Mock the child components
vi.mock('./SearchResults', () => ({
  SearchResults: ({ results, onResultSelect }: any) => (
    <div data-testid="search-results">
      {results.map((result: SearchResult) => (
        <button key={result.externalId} onClick={() => onResultSelect(result)}>
          {result.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('./MetadataPreview', () => ({
  MetadataPreview: ({ metadata, onImport }: any) => (
    <div data-testid="metadata-preview">
      {metadata && <div>{metadata.title}</div>}
      <button onClick={onImport}>Import</button>
    </div>
  ),
}));

describe('ExternalSearchModal', () => {
  let mockProviderRegistry: ProviderRegistry;
  let mockPlexClient: PlexClient;

  const mockSearchResults: SearchResult[] = [
    {
      externalId: '603',
      title: 'The Matrix',
      year: 1999,
      provider: 'tmdb',
    },
  ];

  const mockMetadata: ExternalMetadata = {
    externalId: '603',
    title: 'The Matrix',
    year: 1999,
    provider: 'tmdb',
  };

  beforeEach(() => {
    mockPlexClient = {} as PlexClient;
    mockProviderRegistry = new ProviderRegistry(mockPlexClient, {
      tmdb: { apiKey: 'test-key' },
    });

    vi.spyOn(mockProviderRegistry, 'getAvailableProviders').mockReturnValue(['tmdb', 'imdb']);
    vi.spyOn(mockProviderRegistry, 'search').mockResolvedValue(mockSearchResults);
    vi.spyOn(mockProviderRegistry, 'getDetails').mockResolvedValue(mockMetadata);
    vi.spyOn(mockProviderRegistry, 'importMetadata').mockResolvedValue();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <ExternalSearchModal
        isOpen={false}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
      />
    );
    
    expect(screen.getByText('Search External Metadata')).toBeInTheDocument();
  });

  it('displays provider selection buttons', () => {
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
      />
    );
    
    expect(screen.getByText('TMDB')).toBeInTheDocument();
    expect(screen.getByText('IMDB')).toBeInTheDocument();
  });

  it('pre-fills search query with current title', () => {
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Enter title to search...');
    expect(searchInput).toHaveValue('The Matrix');
  });

  it('pre-fills year with current year', () => {
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentYear={1999}
      />
    );
    
    const yearInput = screen.getByPlaceholderText('Filter by year...');
    expect(yearInput).toHaveValue(1999);
  });

  it('performs search when search button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockProviderRegistry.search).toHaveBeenCalledWith('tmdb', 'The Matrix', 'movie', undefined);
    });
  });

  it('performs search when Enter key is pressed', async () => {
    const user = userEvent.setup();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
      />
    );
    
    const searchInput = screen.getByPlaceholderText('Enter title to search...');
    await user.type(searchInput, 'Inception{Enter}');
    
    await waitFor(() => {
      expect(mockProviderRegistry.search).toHaveBeenCalledWith('tmdb', 'Inception', 'movie', undefined);
    });
  });

  it('includes year in search when provided', async () => {
    const user = userEvent.setup();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
        currentYear={1999}
      />
    );
    
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockProviderRegistry.search).toHaveBeenCalledWith('tmdb', 'The Matrix', 'movie', 1999);
    });
  });

  it('displays search results after search', async () => {
    const user = userEvent.setup();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
  });

  it('loads metadata preview when result is selected', async () => {
    const user = userEvent.setup();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    // Perform search
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    // Select result
    await waitFor(() => {
      const resultButton = screen.getByText('The Matrix');
      user.click(resultButton);
    });
    
    await waitFor(() => {
      expect(mockProviderRegistry.getDetails).toHaveBeenCalledWith('tmdb', '603');
      expect(screen.getByTestId('metadata-preview')).toBeInTheDocument();
    });
  });

  it('imports metadata when import button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={onClose}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    // Perform search
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    // Select result
    await waitFor(async () => {
      const resultButton = screen.getByText('The Matrix');
      await user.click(resultButton);
    });
    
    // Import
    await waitFor(async () => {
      const importButton = screen.getByText('Import');
      await user.click(importButton);
    });
    
    await waitFor(() => {
      expect(mockProviderRegistry.importMetadata).toHaveBeenCalledWith('tmdb', '123', '603');
    });
  });

  it('displays success message after import', async () => {
    const user = userEvent.setup();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    // Perform search, select, and import
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    await waitFor(async () => {
      const resultButton = screen.getByText('The Matrix');
      await user.click(resultButton);
    });
    
    await waitFor(async () => {
      const importButton = screen.getByText('Import');
      await user.click(importButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Metadata imported successfully!')).toBeInTheDocument();
    });
  });

  it('displays error message on search failure', async () => {
    const user = userEvent.setup();
    vi.spyOn(mockProviderRegistry, 'search').mockRejectedValue(new Error('Network error'));
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={onClose}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
      />
    );
    
    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={onClose}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
      />
    );
    
    const backdrop = screen.getByText('Search External Metadata').closest('div')?.previousSibling;
    if (backdrop) {
      await user.click(backdrop as Element);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('allows switching providers', async () => {
    const user = userEvent.setup();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    const imdbButton = screen.getByText('IMDB');
    await user.click(imdbButton);
    
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    await waitFor(() => {
      expect(mockProviderRegistry.search).toHaveBeenCalledWith('imdb', 'The Matrix', 'movie', undefined);
    });
  });

  it('disables search button when query is empty', () => {
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
      />
    );
    
    const searchButton = screen.getByText('Search');
    expect(searchButton).toBeDisabled();
  });

  it('shows back button when viewing preview', async () => {
    const user = userEvent.setup();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    // Perform search and select result
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    await waitFor(async () => {
      const resultButton = screen.getByText('The Matrix');
      await user.click(resultButton);
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText('Back to results')).toBeInTheDocument();
    });
  });

  it('returns to search results when back button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ExternalSearchModal
        isOpen={true}
        onClose={vi.fn()}
        providerRegistry={mockProviderRegistry}
        ratingKey="123"
        mediaType="movie"
        currentTitle="The Matrix"
      />
    );
    
    // Perform search and select result
    const searchButton = screen.getByText('Search');
    await user.click(searchButton);
    
    await waitFor(async () => {
      const resultButton = screen.getByText('The Matrix');
      await user.click(resultButton);
    });
    
    // Click back
    await waitFor(async () => {
      const backButton = screen.getByLabelText('Back to results');
      await user.click(backButton);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument();
    });
  });
});
