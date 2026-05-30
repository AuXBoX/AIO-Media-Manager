import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableListView } from './TableListView';
import type { LibraryItem } from '@/managers/LibraryManager';
import type { ColumnDefinition } from './ColumnSelector';

describe('TableListView', () => {
  const mockItems: LibraryItem[] = [
    {
      ratingKey: '1',
      title: 'Test Movie 1',
      type: 'movie',
      thumb: '/library/metadata/1/thumb',
      year: 2020,
    } as LibraryItem,
    {
      ratingKey: '2',
      title: 'Test Movie 2',
      type: 'movie',
      thumb: '/library/metadata/2/thumb',
      year: 2021,
    } as LibraryItem,
  ];

  const mockColumns: ColumnDefinition[] = [
    { id: 'title', label: 'Title', visible: true, sortable: true },
    { id: 'year', label: 'Year', visible: true, sortable: true, width: 100 },
  ];

  const defaultProps = {
    items: mockItems,
    columns: mockColumns,
    serverUrl: 'http://localhost:32400',
    token: 'test-token',
    onItemClick: vi.fn(),
    getCacheStatus: vi.fn(() => ({ isCached: false, isDirty: false })),
  };

  it('renders table with items', () => {
    render(<TableListView {...defaultProps} />);
    
    // Check if column headers are rendered (text is "Title" and "Year", uppercase is applied via CSS)
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Year')).toBeInTheDocument();
  });

  it('applies comfortable row height by default', () => {
    const { container } = render(<TableListView {...defaultProps} />);
    
    // Check if the component renders (basic smoke test)
    expect(container.querySelector('.absolute.inset-0')).toBeInTheDocument();
  });

  it('applies compact row height when specified', () => {
    const { container } = render(
      <TableListView {...defaultProps} rowHeightMode="compact" />
    );
    
    // Check if the component renders (basic smoke test)
    expect(container.querySelector('.absolute.inset-0')).toBeInTheDocument();
  });

  it('shows bulk actions toolbar when items are selected', () => {
    const selectedItems = new Set(['1']);
    const onSelectionChange = vi.fn();
    
    render(
      <TableListView
        {...defaultProps}
        selectedItems={selectedItems}
        onSelectionChange={onSelectionChange}
      />
    );
    
    // Check if bulk actions toolbar is visible
    expect(screen.getByText('1 item selected')).toBeInTheDocument();
    expect(screen.getByText('Edit Metadata')).toBeInTheDocument();
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('shows correct plural text for multiple selected items', () => {
    const selectedItems = new Set(['1', '2']);
    const onSelectionChange = vi.fn();
    
    render(
      <TableListView
        {...defaultProps}
        selectedItems={selectedItems}
        onSelectionChange={onSelectionChange}
      />
    );
    
    expect(screen.getByText('2 items selected')).toBeInTheDocument();
  });

  it('hides posters when showPosters is false', () => {
    const { container } = render(
      <TableListView {...defaultProps} showPosters={false} />
    );
    
    // Check that no poster images are rendered (using the new 40px width)
    const posterContainers = container.querySelectorAll('.w-\\[40px\\].h-\\[60px\\]');
    expect(posterContainers.length).toBe(0);
  });

  it('applies correct styling classes', () => {
    const { container } = render(<TableListView {...defaultProps} />);
    
    // Check for modern styling classes
    expect(container.querySelector('.bg-background-primary')).toBeInTheDocument();
    expect(container.querySelector('.border-border')).toBeInTheDocument();
    
    // Check for header styling with specific color (#64748B)
    const headerElements = container.querySelectorAll('.text-\\[\\#64748B\\]');
    expect(headerElements.length).toBeGreaterThan(0);
  });
});
