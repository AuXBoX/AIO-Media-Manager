import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('should render search input', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
  });

  it('should render with custom placeholder', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} placeholder="Search movies..." />);

    expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
  });

  it('should render with initial value', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} initialValue="test query" />);

    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    expect(input.value).toBe('test query');
  });

  it('should update input value when typing', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, 'test');

    expect(input).toHaveValue('test');
  });

  it('should debounce search calls', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, 'test');

    // Should not call immediately
    expect(onSearch).not.toHaveBeenCalled();

    // Wait for debounce
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test');
    }, { timeout: 500 });
  });

  it('should only call search once after multiple rapid inputs', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup({ delay: null });
    render(<SearchBar onSearch={onSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText('Search...');
    
    await user.type(input, 'test');
    
    // Wait for debounce
    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledTimes(1);
      expect(onSearch).toHaveBeenCalledWith('test');
    }, { timeout: 500 });
  });

  it('should trim search query', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, '  test query  ');

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith('test query');
    }, { timeout: 500 });
  });

  it('should not call search for empty query', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} debounceMs={300} />);

    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, '   ');

    // Wait a bit to ensure it doesn't call
    await new Promise(resolve => setTimeout(resolve, 400));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('should show clear button when input has value', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, 'test');

    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('should not show clear button when input is empty', () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('should clear input when clear button clicked', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Search...') as HTMLInputElement;
    await user.type(input, 'test');

    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);

    expect(input.value).toBe('');
  });

  it('should call onSearch with empty string when cleared', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Search...');
    await user.type(input, 'test');

    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);

    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('should show focus ring when focused', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText('Search...');
    await user.click(input);

    const wrapper = container.querySelector('.ring-2');
    expect(wrapper).toBeInTheDocument();
  });

  it('should render search icon', () => {
    const onSearch = vi.fn();
    const { container } = render(<SearchBar onSearch={onSearch} />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
