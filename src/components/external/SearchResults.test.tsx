import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResults } from './SearchResults';
import { SearchResult } from '@/types';

describe('SearchResults', () => {
  const mockResults: SearchResult[] = [
    {
      externalId: '1',
      title: 'The Matrix',
      originalTitle: 'The Matrix',
      year: 1999,
      thumb: 'https://example.com/matrix.jpg',
      summary: 'A computer hacker learns about the true nature of reality.',
      provider: 'tmdb',
    },
    {
      externalId: '2',
      title: 'Inception',
      year: 2010,
      summary: 'A thief who steals corporate secrets through dream-sharing technology.',
      provider: 'tmdb',
    },
  ];

  it('renders loading state', () => {
    render(<SearchResults results={[]} isLoading={true} onResultSelect={vi.fn()} />);
    
    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('renders empty state when no results', () => {
    render(<SearchResults results={[]} isLoading={false} onResultSelect={vi.fn()} />);
    
    expect(screen.getByText('No Results')).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your search query/)).toBeInTheDocument();
  });

  it('renders search results', () => {
    render(<SearchResults results={mockResults} isLoading={false} onResultSelect={vi.fn()} />);
    
    expect(screen.getByText('2 results found')).toBeInTheDocument();
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('Inception')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText('2010')).toBeInTheDocument();
  });

  it('displays thumbnails when available', () => {
    render(<SearchResults results={mockResults} isLoading={false} onResultSelect={vi.fn()} />);
    
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', 'https://example.com/matrix.jpg');
    expect(images[0]).toHaveAttribute('alt', 'The Matrix');
  });

  it('displays provider badges', () => {
    render(<SearchResults results={mockResults} isLoading={false} onResultSelect={vi.fn()} />);
    
    const badges = screen.getAllByText('TMDB');
    expect(badges).toHaveLength(2);
  });

  it('calls onResultSelect when result is clicked', async () => {
    const user = userEvent.setup();
    const onResultSelect = vi.fn();
    
    render(<SearchResults results={mockResults} isLoading={false} onResultSelect={onResultSelect} />);
    
    const firstResult = screen.getByText('The Matrix').closest('button');
    expect(firstResult).toBeInTheDocument();
    
    await user.click(firstResult!);
    
    expect(onResultSelect).toHaveBeenCalledWith(mockResults[0]);
  });

  it('displays summary text when available', () => {
    render(<SearchResults results={mockResults} isLoading={false} onResultSelect={vi.fn()} />);
    
    expect(screen.getByText(/A computer hacker learns/)).toBeInTheDocument();
    expect(screen.getByText(/A thief who steals corporate secrets/)).toBeInTheDocument();
  });

  it('displays original title when different from title', () => {
    const resultsWithOriginalTitle: SearchResult[] = [
      {
        externalId: '3',
        title: 'The Shawshank Redemption',
        originalTitle: 'Rita Hayworth and Shawshank Redemption',
        year: 1994,
        provider: 'imdb',
      },
    ];
    
    render(<SearchResults results={resultsWithOriginalTitle} isLoading={false} onResultSelect={vi.fn()} />);
    
    expect(screen.getByText('Rita Hayworth and Shawshank Redemption')).toBeInTheDocument();
  });

  it('renders singular "result" for single result', () => {
    render(<SearchResults results={[mockResults[0]]} isLoading={false} onResultSelect={vi.fn()} />);
    
    expect(screen.getByText('1 result found')).toBeInTheDocument();
  });
});
