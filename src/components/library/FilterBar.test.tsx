import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar, FilterGroup } from './FilterBar';

describe('FilterBar', () => {
  const mockFilters: FilterGroup[] = [
    {
      key: 'genre',
      label: 'Genre',
      options: [
        { key: '1', label: 'Rock', value: 'rock' },
        { key: '2', label: 'Jazz', value: 'jazz' },
      ],
    },
    {
      key: 'year',
      label: 'Year',
      options: [
        { key: '2020', label: '2020', value: '2020' },
        { key: '2021', label: '2021', value: '2021' },
      ],
    },
  ];

  const defaultProps = {
    filters: mockFilters,
    activeFilters: {},
    onFilterChange: vi.fn(),
    onClearFilters: vi.fn(),
  };

  it('should render filter button', () => {
    render(<FilterBar {...defaultProps} />);

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('should not render when no filters provided', () => {
    const { container } = render(<FilterBar {...defaultProps} filters={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('should expand filters when clicked', async () => {
    render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByText('Filters');
    await userEvent.click(filterButton);

    expect(screen.getByLabelText('Genre')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
  });

  it('should collapse filters when clicked again', async () => {
    render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByText('Filters');
    await userEvent.click(filterButton);
    expect(screen.getByLabelText('Genre')).toBeInTheDocument();

    await userEvent.click(filterButton);
    expect(screen.queryByLabelText('Genre')).not.toBeInTheDocument();
  });

  it('should display active filter count', () => {
    const activeFilters = { genre: 'rock', year: '2020' };
    render(<FilterBar {...defaultProps} activeFilters={activeFilters} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should not display count when no active filters', () => {
    render(<FilterBar {...defaultProps} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should call onFilterChange when filter selected', async () => {
    const onFilterChange = vi.fn();
    render(<FilterBar {...defaultProps} onFilterChange={onFilterChange} />);

    const filterButton = screen.getByText('Filters');
    await userEvent.click(filterButton);

    const genreSelect = screen.getByLabelText('Genre');
    await userEvent.selectOptions(genreSelect, 'rock');

    expect(onFilterChange).toHaveBeenCalledWith('genre', 'rock');
  });

  it('should display clear all button when filters active', () => {
    const activeFilters = { genre: 'rock' };
    render(<FilterBar {...defaultProps} activeFilters={activeFilters} />);

    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('should not display clear all button when no filters active', () => {
    render(<FilterBar {...defaultProps} />);

    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });

  it('should call onClearFilters when clear all clicked', async () => {
    const onClearFilters = vi.fn();
    const activeFilters = { genre: 'rock' };
    render(
      <FilterBar {...defaultProps} activeFilters={activeFilters} onClearFilters={onClearFilters} />
    );

    const clearButton = screen.getByText('Clear all');
    await userEvent.click(clearButton);

    expect(onClearFilters).toHaveBeenCalled();
  });

  it('should render all filter options', async () => {
    render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByText('Filters');
    await userEvent.click(filterButton);

    const genreSelect = screen.getByLabelText('Genre');
    expect(genreSelect).toHaveTextContent('All');
    expect(genreSelect).toHaveTextContent('Rock');
    expect(genreSelect).toHaveTextContent('Jazz');
  });

  it('should show selected filter value', async () => {
    const activeFilters = { genre: 'rock' };
    render(<FilterBar {...defaultProps} activeFilters={activeFilters} />);

    const filterButton = screen.getByText('Filters');
    await userEvent.click(filterButton);

    const genreSelect = screen.getByLabelText('Genre') as HTMLSelectElement;
    expect(genreSelect.value).toBe('rock');
  });

  it('should rotate arrow icon when expanded', async () => {
    const { container } = render(<FilterBar {...defaultProps} />);

    const filterButton = screen.getByText('Filters');
    
    // Check initial state
    let svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    await userEvent.click(filterButton);
    
    // After click, should have rotate class
    svg = container.querySelector('svg');
    expect(svg?.classList.contains('rotate-180')).toBe(true);
  });
});
