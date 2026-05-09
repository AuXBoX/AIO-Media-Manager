import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchResults } from './SearchResults';
import { SearchHub } from '../../managers/SearchManager';

describe('SearchResults', () => {
  const mockHubs: SearchHub[] = [
    {
      title: 'Movies',
      type: 'movie',
      size: 2,
      items: [
        {
          ratingKey: '1',
          key: '/library/metadata/1',
          guid: 'plex://movie/1',
          type: 'movie',
          title: 'Test Movie 1',
          year: 2020,
          thumb: '/library/metadata/1/thumb',
          addedAt: 1609459200,
          updatedAt: 1609459200,
        },
        {
          ratingKey: '2',
          key: '/library/metadata/2',
          guid: 'plex://movie/2',
          type: 'movie',
          title: 'Test Movie 2',
          year: 2021,
          addedAt: 1609459200,
          updatedAt: 1609459200,
        },
      ],
    },
    {
      title: 'TV Shows',
      type: 'show',
      size: 1,
      items: [
        {
          ratingKey: '3',
          key: '/library/metadata/3',
          guid: 'plex://show/3',
          type: 'show',
          title: 'Test Show',
          year: 2019,
          addedAt: 1609459200,
          updatedAt: 1609459200,
        },
      ],
    },
  ];

  const defaultProps = {
    hubs: mockHubs,
    onItemClick: vi.fn(),
    serverUrl: 'http://localhost:32400',
    token: 'test-token',
  };

  it('should render loading state', () => {
    render(<SearchResults {...defaultProps} hubs={[]} isLoading={true} />);

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('should render empty state when no results', () => {
    render(<SearchResults {...defaultProps} hubs={[]} />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search query')).toBeInTheDocument();
  });

  it('should render all hubs', () => {
    render(<SearchResults {...defaultProps} />);

    expect(screen.getByText('Movies')).toBeInTheDocument();
    expect(screen.getByText('TV Shows')).toBeInTheDocument();
  });

  it('should display hub sizes', () => {
    render(<SearchResults {...defaultProps} />);

    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('should render all items in hubs', () => {
    render(<SearchResults {...defaultProps} />);

    expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Test Movie 2')).toBeInTheDocument();
    expect(screen.getByText('Test Show')).toBeInTheDocument();
  });

  it('should display item years', () => {
    render(<SearchResults {...defaultProps} />);

    expect(screen.getByText('2020')).toBeInTheDocument();
    expect(screen.getByText('2021')).toBeInTheDocument();
    expect(screen.getByText('2019')).toBeInTheDocument();
  });

  it('should call onItemClick when item clicked', async () => {
    const onItemClick = vi.fn();
    render(<SearchResults {...defaultProps} onItemClick={onItemClick} />);

    const item = screen.getByText('Test Movie 1');
    await userEvent.click(item);

    expect(onItemClick).toHaveBeenCalledWith(mockHubs[0]!.items[0]);
  });

  it('should render item thumbnails with correct URL', () => {
    render(<SearchResults {...defaultProps} />);

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute(
      'src',
      'http://localhost:32400/library/metadata/1/thumb?X-Plex-Token=test-token'
    );
  });

  it('should render placeholder when no thumbnail', () => {
    const hubsWithoutThumbs: SearchHub[] = [
      {
        title: 'Movies',
        type: 'movie',
        size: 1,
        items: [
          {
            ratingKey: '1',
            key: '/library/metadata/1',
            guid: 'plex://movie/1',
            type: 'movie',
            title: 'Test Movie',
            addedAt: 1609459200,
            updatedAt: 1609459200,
          },
        ],
      },
    ];

    const { container } = render(<SearchResults {...defaultProps} hubs={hubsWithoutThumbs} />);

    const placeholderSvg = container.querySelector('svg[viewBox="0 0 24 24"]');
    expect(placeholderSvg).toBeInTheDocument();
  });

  it('should use lazy loading for images', () => {
    render(<SearchResults {...defaultProps} />);

    const images = screen.getAllByRole('img').filter(img => img.tagName === 'IMG');
    images.forEach((img) => {
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  it('should have proper alt text for images', () => {
    render(<SearchResults {...defaultProps} />);

    expect(screen.getByAltText('Test Movie 1')).toBeInTheDocument();
    // Test Movie 2 has no thumb, so it uses role="img" with aria-label
    expect(screen.getByLabelText('Test Movie 2')).toBeInTheDocument();
    // Test Show has no thumb, so it uses role="img" with aria-label
    expect(screen.getByLabelText('Test Show')).toBeInTheDocument();
  });

  it('should render items in grid layout', () => {
    const { container } = render(<SearchResults {...defaultProps} />);

    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid-cols-2');
  });

  it('should handle multiple hubs with different types', () => {
    render(<SearchResults {...defaultProps} />);

    // Check that both hub types are rendered
    expect(screen.getByText('Movies')).toBeInTheDocument();
    expect(screen.getByText('TV Shows')).toBeInTheDocument();

    // Check that items from both hubs are rendered
    expect(screen.getByText('Test Movie 1')).toBeInTheDocument();
    expect(screen.getByText('Test Show')).toBeInTheDocument();
  });

  it('should apply hover styles to cards', () => {
    const { container } = render(<SearchResults {...defaultProps} />);

    const cards = container.querySelectorAll('[role="button"]');
    cards.forEach((card) => {
      expect(card).toHaveClass('hover:shadow-md');
    });
  });

  it('should have focus styles for accessibility', () => {
    const { container } = render(<SearchResults {...defaultProps} />);

    const cards = container.querySelectorAll('[role="button"]');
    cards.forEach((card) => {
      expect(card).toHaveClass('focus:ring-2');
      expect(card).toHaveClass('focus:ring-blue-500');
    });
  });
});
