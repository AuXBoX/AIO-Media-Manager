import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetadataPreview } from './MetadataPreview';
import { ExternalMetadata } from '@/types';

describe('MetadataPreview', () => {
  const mockMetadata: ExternalMetadata = {
    externalId: '603',
    title: 'The Matrix',
    originalTitle: 'The Matrix',
    summary: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
    tagline: 'Welcome to the Real World',
    rating: 8.7,
    year: 1999,
    releaseDate: '1999-03-31',
    runtime: 136,
    genres: ['Action', 'Science Fiction'],
    cast: [
      {
        name: 'Keanu Reeves',
        character: 'Neo',
        profilePath: 'https://example.com/keanu.jpg',
        order: 0,
      },
      {
        name: 'Laurence Fishburne',
        character: 'Morpheus',
        profilePath: 'https://example.com/laurence.jpg',
        order: 1,
      },
    ],
    crew: [
      {
        name: 'Lana Wachowski',
        job: 'Director',
        department: 'Directing',
        profilePath: 'https://example.com/lana.jpg',
      },
      {
        name: 'Lilly Wachowski',
        job: 'Director',
        department: 'Directing',
        profilePath: 'https://example.com/lilly.jpg',
      },
    ],
    posters: ['https://example.com/poster.jpg'],
    backdrops: ['https://example.com/backdrop1.jpg', 'https://example.com/backdrop2.jpg'],
    provider: 'tmdb',
  };

  it('renders loading state', () => {
    render(
      <MetadataPreview
        metadata={null}
        isLoading={true}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('Loading metadata...')).toBeInTheDocument();
  });

  it('renders empty state when no metadata', () => {
    render(
      <MetadataPreview
        metadata={null}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('No Metadata Available')).toBeInTheDocument();
  });

  it('renders metadata details', () => {
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('"Welcome to the Real World"')).toBeInTheDocument();
    expect(screen.getByText('1999')).toBeInTheDocument();
    expect(screen.getByText(/136.*min/)).toBeInTheDocument();
    expect(screen.getByText(/8\.7\/10/)).toBeInTheDocument();
  });

  it('renders summary', () => {
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText(/A computer hacker learns from mysterious rebels/)).toBeInTheDocument();
  });

  it('renders genres', () => {
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Science Fiction')).toBeInTheDocument();
  });

  it('renders cast members', () => {
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('Keanu Reeves')).toBeInTheDocument();
    expect(screen.getByText('Neo')).toBeInTheDocument();
    expect(screen.getByText('Laurence Fishburne')).toBeInTheDocument();
    expect(screen.getByText('Morpheus')).toBeInTheDocument();
  });

  it('renders crew members', () => {
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('Lana Wachowski, Lilly Wachowski')).toBeInTheDocument();
  });

  it('renders poster image', () => {
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    const poster = screen.getByAltText('The Matrix');
    expect(poster).toHaveAttribute('src', 'https://example.com/poster.jpg');
  });

  it('renders backdrop images', () => {
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    const backdrops = screen.getAllByAltText(/Backdrop/);
    expect(backdrops).toHaveLength(2);
  });

  it('calls onImport when import button is clicked', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={onImport}
        isImporting={false}
      />
    );
    
    const importButton = screen.getByText('Import This Metadata');
    await user.click(importButton);
    
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('disables import button when importing', () => {
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={true}
      />
    );
    
    const importButton = screen.getByText('Importing...');
    expect(importButton).toBeDisabled();
  });

  it('displays provider source', () => {
    render(
      <MetadataPreview
        metadata={mockMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('Source: TMDB')).toBeInTheDocument();
  });

  it('handles metadata without optional fields', () => {
    const minimalMetadata: ExternalMetadata = {
      externalId: '1',
      title: 'Test Movie',
      provider: 'imdb',
    };
    
    render(
      <MetadataPreview
        metadata={minimalMetadata}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('Source: IMDB')).toBeInTheDocument();
  });

  it('limits cast display to 8 members', () => {
    const metadataWithManyCast: ExternalMetadata = {
      ...mockMetadata,
      cast: Array.from({ length: 12 }, (_, i) => ({
        name: `Actor ${i + 1}`,
        character: `Character ${i + 1}`,
        order: i,
      })),
    };
    
    render(
      <MetadataPreview
        metadata={metadataWithManyCast}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('+ 4 more cast members')).toBeInTheDocument();
  });

  it('limits backdrop display to 4 images', () => {
    const metadataWithManyBackdrops: ExternalMetadata = {
      ...mockMetadata,
      backdrops: Array.from({ length: 8 }, (_, i) => `https://example.com/backdrop${i}.jpg`),
    };
    
    render(
      <MetadataPreview
        metadata={metadataWithManyBackdrops}
        isLoading={false}
        onImport={vi.fn()}
        isImporting={false}
      />
    );
    
    expect(screen.getByText('+ 4 more backdrops available')).toBeInTheDocument();
  });
});
