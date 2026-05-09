import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPanel } from './FilterPanel';
import { LibraryFilter } from '../../managers/LibraryManager';

describe('FilterPanel', () => {
  const mockFilters: LibraryFilter[] = [
    {
      key: 'genre',
      title: 'Genre',
      type: 'tag',
      values: [
        { key: 'action', title: 'Action', count: 10 },
        { key: 'comedy', title: 'Comedy', count: 5 },
      ],
    },
    {
      key: 'year',
      title: 'Year',
      type: 'integer',
    },
    {
      key: 'rating',
      title: 'Rating',
      type: 'number',
    },
  ];

  const defaultProps = {
    filters: mockFilters,
    activeFilters: {},
    onFilterChange: vi.fn(),
    onApply: vi.fn(),
    onClear: vi.fn(),
  };

  it('should render filter panel button', () => {
    render(<FilterPanel {...defaultProps} />);

    expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
  });

  it('should expand panel when clicked', async () => {
    render(<FilterPanel {...defaultProps} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    expect(screen.getByText('Genre')).toBeInTheDocument();
    expect(screen.getByText('Year')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
  });

  it('should collapse panel when clicked again', async () => {
    render(<FilterPanel {...defaultProps} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);
    expect(screen.getByText('Genre')).toBeInTheDocument();

    await userEvent.click(button);
    expect(screen.queryByText('Genre')).not.toBeInTheDocument();
  });

  it('should display active filter count', () => {
    const activeFilters = { genre: 'action', year: 2020 };
    render(<FilterPanel {...defaultProps} activeFilters={activeFilters} />);

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should not display count when no active filters', () => {
    render(<FilterPanel {...defaultProps} />);

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('should show Clear button when filters are active', () => {
    const activeFilters = { genre: 'action' };
    render(<FilterPanel {...defaultProps} activeFilters={activeFilters} />);

    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('should show Save Preset button when onSavePreset provided and filters active', () => {
    const activeFilters = { genre: 'action' };
    const onSavePreset = vi.fn();
    render(<FilterPanel {...defaultProps} activeFilters={activeFilters} onSavePreset={onSavePreset} />);

    expect(screen.getByText('Save Preset')).toBeInTheDocument();
  });

  it('should not show Save Preset button when no filters active', () => {
    const onSavePreset = vi.fn();
    render(<FilterPanel {...defaultProps} onSavePreset={onSavePreset} />);

    expect(screen.queryByText('Save Preset')).not.toBeInTheDocument();
  });

  it('should call onSavePreset when Save Preset clicked', async () => {
    const activeFilters = { genre: 'action' };
    const onSavePreset = vi.fn();
    render(<FilterPanel {...defaultProps} activeFilters={activeFilters} onSavePreset={onSavePreset} />);

    const saveButton = screen.getByText('Save Preset');
    await userEvent.click(saveButton);

    expect(onSavePreset).toHaveBeenCalled();
  });

  it('should render tag filter as select with options', async () => {
    render(<FilterPanel {...defaultProps} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    const genreSelect = screen.getByLabelText('Genre') as HTMLSelectElement;
    expect(genreSelect.tagName).toBe('SELECT');
    expect(genreSelect).toHaveTextContent('Action (10)');
    expect(genreSelect).toHaveTextContent('Comedy (5)');
  });

  it('should render integer filter as number input', async () => {
    render(<FilterPanel {...defaultProps} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    const yearInput = screen.getByLabelText('Year') as HTMLInputElement;
    expect(yearInput.type).toBe('number');
  });

  it('should call onFilterChange when filter value changes', async () => {
    const onFilterChange = vi.fn();
    render(<FilterPanel {...defaultProps} onFilterChange={onFilterChange} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    const genreSelect = screen.getByLabelText('Genre');
    await userEvent.selectOptions(genreSelect, 'action');

    expect(onFilterChange).toHaveBeenCalledWith({ genre: 'action' });
  });

  it('should remove filter when value cleared', async () => {
    const onFilterChange = vi.fn();
    const activeFilters = { genre: 'action' };
    render(<FilterPanel {...defaultProps} activeFilters={activeFilters} onFilterChange={onFilterChange} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    const genreSelect = screen.getByLabelText('Genre');
    await userEvent.selectOptions(genreSelect, '');

    expect(onFilterChange).toHaveBeenCalledWith({});
  });

  it('should call onApply when Apply Filters clicked', async () => {
    const onApply = vi.fn();
    render(<FilterPanel {...defaultProps} onApply={onApply} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    const applyButton = screen.getByText('Apply Filters');
    await userEvent.click(applyButton);

    expect(onApply).toHaveBeenCalled();
  });

  it('should call onClear when Clear All clicked', async () => {
    const onClear = vi.fn();
    render(<FilterPanel {...defaultProps} onClear={onClear} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    const clearButton = screen.getByText('Clear All');
    await userEvent.click(clearButton);

    expect(onClear).toHaveBeenCalled();
  });

  it('should render boolean filter as select with Yes/No', async () => {
    const booleanFilter: LibraryFilter = {
      key: 'watched',
      title: 'Watched',
      type: 'boolean',
    };

    render(<FilterPanel {...defaultProps} filters={[booleanFilter]} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    const watchedSelect = screen.getByLabelText('Watched') as HTMLSelectElement;
    expect(watchedSelect).toHaveTextContent('All');
    expect(watchedSelect).toHaveTextContent('Yes');
    expect(watchedSelect).toHaveTextContent('No');
  });

  it('should render date filter as date input', async () => {
    const dateFilter: LibraryFilter = {
      key: 'releaseDate',
      title: 'Release Date',
      type: 'date',
    };

    render(<FilterPanel {...defaultProps} filters={[dateFilter]} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    const dateInput = screen.getByLabelText('Release Date') as HTMLInputElement;
    expect(dateInput.type).toBe('date');
  });

  it('should render string filter as text input', async () => {
    const stringFilter: LibraryFilter = {
      key: 'title',
      title: 'Title',
      type: 'string',
    };

    render(<FilterPanel {...defaultProps} filters={[stringFilter]} />);

    const button = screen.getByText('Advanced Filters');
    await userEvent.click(button);

    const titleInput = screen.getByLabelText('Title') as HTMLInputElement;
    expect(titleInput.type).toBe('text');
  });

  it('should rotate arrow icon when expanded', async () => {
    const { container } = render(<FilterPanel {...defaultProps} />);

    const button = screen.getByText('Advanced Filters');
    
    let svg = container.querySelector('svg');
    expect(svg).not.toHaveClass('rotate-180');

    await userEvent.click(button);
    
    svg = container.querySelector('svg');
    expect(svg).toHaveClass('rotate-180');
  });
});
