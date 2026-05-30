import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  EmptyState,
  LibraryEmptyState,
  DetailPanelEmptyState,
  SearchEmptyState,
  PlaylistEmptyState,
} from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <EmptyState
        title="No items"
        description="This is a description"
      />
    );
    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <EmptyState
        title="No items"
        icon={<div data-testid="custom-icon">Icon</div>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders primary action button', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Add Item',
          onClick: handleClick,
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: /add item/i });
    expect(button).toBeInTheDocument();
    
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action button', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(
      <EmptyState
        title="No items"
        secondaryAction={{
          label: 'Learn More',
          onClick: handleClick,
        }}
      />
    );
    
    const button = screen.getByRole('button', { name: /learn more/i });
    expect(button).toBeInTheDocument();
    
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders both action buttons', () => {
    render(
      <EmptyState
        title="No items"
        action={{
          label: 'Primary',
          onClick: vi.fn(),
        }}
        secondaryAction={{
          label: 'Secondary',
          onClick: vi.fn(),
        }}
      />
    );
    
    expect(screen.getByRole('button', { name: /primary/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /secondary/i })).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<EmptyState title="Small" size="sm" />);
    expect(screen.getByText('Small').parentElement).toHaveClass('py-8');
    
    rerender(<EmptyState title="Medium" size="md" />);
    expect(screen.getByText('Medium').parentElement).toHaveClass('py-12');
    
    rerender(<EmptyState title="Large" size="lg" />);
    expect(screen.getByText('Large').parentElement).toHaveClass('py-16');
  });

  it('applies custom className', () => {
    render(<EmptyState title="Test" className="custom-class" />);
    expect(screen.getByText('Test').parentElement).toHaveClass('custom-class');
  });
});

describe('LibraryEmptyState', () => {
  it('renders with default library name', () => {
    render(<LibraryEmptyState />);
    expect(screen.getByText(/this library is empty/i)).toBeInTheDocument();
  });

  it('renders with custom library name', () => {
    render(<LibraryEmptyState libraryName="Movies" />);
    expect(screen.getByText(/this movies is empty/i)).toBeInTheDocument();
  });

  it('renders library icon', () => {
    render(<LibraryEmptyState />);
    // Check for SVG element
    const svg = screen.getByText('No items found').parentElement?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('DetailPanelEmptyState', () => {
  it('renders no selection message', () => {
    render(<DetailPanelEmptyState />);
    expect(screen.getByText('No selection')).toBeInTheDocument();
    expect(screen.getByText(/select an item from the library/i)).toBeInTheDocument();
  });

  it('renders selection icon', () => {
    render(<DetailPanelEmptyState />);
    const svg = screen.getByText('No selection').parentElement?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('SearchEmptyState', () => {
  it('renders without query', () => {
    render(<SearchEmptyState />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText(/try adjusting your search criteria/i)).toBeInTheDocument();
  });

  it('renders with query', () => {
    render(<SearchEmptyState query="test query" />);
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText(/no items match "test query"/i)).toBeInTheDocument();
  });

  it('renders search icon', () => {
    render(<SearchEmptyState />);
    const svg = screen.getByText('No results found').parentElement?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

describe('PlaylistEmptyState', () => {
  it('renders empty playlist message', () => {
    render(<PlaylistEmptyState />);
    expect(screen.getByText('Empty playlist')).toBeInTheDocument();
    expect(screen.getByText(/add items to this playlist/i)).toBeInTheDocument();
  });

  it('renders without action button when onAddItems not provided', () => {
    render(<PlaylistEmptyState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders action button when onAddItems provided', async () => {
    const user = userEvent.setup();
    const handleAddItems = vi.fn();
    
    render(<PlaylistEmptyState onAddItems={handleAddItems} />);
    
    const button = screen.getByRole('button', { name: /add items/i });
    expect(button).toBeInTheDocument();
    
    await user.click(button);
    expect(handleAddItems).toHaveBeenCalledTimes(1);
  });

  it('renders playlist icon', () => {
    render(<PlaylistEmptyState />);
    const svg = screen.getByText('Empty playlist').parentElement?.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
