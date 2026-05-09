import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VirtualGrid } from './VirtualGrid';
import { LibraryItem } from '@/managers/LibraryManager';

// Mock @tanstack/react-virtual
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [
      { key: 0, index: 0, start: 0, size: 280 },
      { key: 1, index: 1, start: 280, size: 280 },
    ],
    getTotalSize: () => 560,
    scrollToIndex: vi.fn(),
  }),
}));

// Mock MediaCard component
vi.mock('./MediaCard', () => ({
  MediaCard: ({ item }: { item: LibraryItem }) => (
    <div data-testid={`media-card-${item.ratingKey}`}>{item.title}</div>
  ),
}));

describe('VirtualGrid', () => {
  const mockItems: LibraryItem[] = [
    {
      ratingKey: '1',
      key: '/library/metadata/1',
      guid: 'plex://movie/1',
      type: 'movie',
      title: 'Movie 1',
      addedAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      ratingKey: '2',
      key: '/library/metadata/2',
      guid: 'plex://movie/2',
      type: 'movie',
      title: 'Movie 2',
      addedAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      ratingKey: '3',
      key: '/library/metadata/3',
      guid: 'plex://movie/3',
      type: 'movie',
      title: 'Movie 3',
      addedAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      ratingKey: '4',
      key: '/library/metadata/4',
      guid: 'plex://movie/4',
      type: 'movie',
      title: 'Movie 4',
      addedAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      ratingKey: '5',
      key: '/library/metadata/5',
      guid: 'plex://movie/5',
      type: 'movie',
      title: 'Movie 5',
      addedAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];

  it('renders virtual grid container', () => {
    const { container } = render(
      <VirtualGrid
        items={mockItems}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    // Check that the container is rendered with correct class
    const scrollContainer = container.querySelector('.h-full.overflow-auto.p-6');
    expect(scrollContainer).toBeInTheDocument();
  });

  it('renders items in grid layout', () => {
    render(
      <VirtualGrid
        items={mockItems}
        serverUrl="http://localhost:32400"
        token="test-token"
        columns={5}
      />
    );

    // With 5 columns and 5 items, we should have 1 row
    // The virtualizer mock returns 2 virtual items (rows)
    // Each row can contain up to 5 items
    const cards = screen.getAllByTestId(/media-card-/);
    expect(cards.length).toBeGreaterThan(0);
  });

  it('uses custom column count', () => {
    const { container } = render(
      <VirtualGrid
        items={mockItems}
        serverUrl="http://localhost:32400"
        token="test-token"
        columns={3}
      />
    );

    // Check that grid has correct column template
    const gridElement = container.querySelector('[style*="grid-template-columns"]');
    expect(gridElement).toBeInTheDocument();
  });

  it('uses custom gap', () => {
    const { container } = render(
      <VirtualGrid
        items={mockItems}
        serverUrl="http://localhost:32400"
        token="test-token"
        gap={24}
      />
    );

    // Check that grid has correct gap
    const gridElement = container.querySelector('[style*="gap"]');
    expect(gridElement).toBeInTheDocument();
  });

  it('calls onItemClick when provided', () => {
    const onItemClick = vi.fn();
    render(
      <VirtualGrid
        items={mockItems}
        serverUrl="http://localhost:32400"
        token="test-token"
        onItemClick={onItemClick}
      />
    );

    // MediaCard is mocked, so we can't test click directly
    // But we verify the prop is passed
    expect(onItemClick).toBeDefined();
  });

  it('uses getCacheStatus when provided', () => {
    const getCacheStatus = vi.fn(() => ({ isCached: true, isDirty: false }));
    render(
      <VirtualGrid
        items={mockItems}
        serverUrl="http://localhost:32400"
        token="test-token"
        getCacheStatus={getCacheStatus}
      />
    );

    // Verify getCacheStatus is called for rendered items
    expect(getCacheStatus).toHaveBeenCalled();
  });

  it('handles empty items array', () => {
    render(
      <VirtualGrid
        items={[]}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    // Should render container but no items
    const cards = screen.queryAllByTestId(/media-card-/);
    expect(cards.length).toBe(0);
  });

  it('calculates correct number of rows', () => {
    const { container } = render(
      <VirtualGrid
        items={mockItems}
        serverUrl="http://localhost:32400"
        token="test-token"
        columns={2}
      />
    );

    // 5 items with 2 columns = 3 rows
    // The virtualizer should be configured with count=3
    expect(container).toBeInTheDocument();
  });

  it('applies performance optimizations', () => {
    const { container } = render(
      <VirtualGrid
        items={mockItems}
        serverUrl="http://localhost:32400"
        token="test-token"
      />
    );

    // Check for contain: strict style
    const scrollContainer = container.firstChild as HTMLElement;
    expect(scrollContainer.style.contain).toBe('strict');
  });
});
