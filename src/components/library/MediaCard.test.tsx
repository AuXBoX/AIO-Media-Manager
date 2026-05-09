import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaCard } from './MediaCard';
import { LibraryItem } from '@/managers/LibraryManager';

describe('MediaCard', () => {
  const mockItem: LibraryItem = {
    ratingKey: '123',
    key: '/library/metadata/123',
    guid: 'plex://album/123',
    type: 'album',
    title: 'Test Album',
    year: 2020,
    thumb: '/library/metadata/123/thumb',
  };

  const defaultProps = {
    item: mockItem,
    viewMode: 'grid' as const,
    serverUrl: 'http://localhost:32400',
    token: 'test-token',
  };

  it('should render in grid view', () => {
    render(<MediaCard {...defaultProps} />);

    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
    expect(screen.getByAltText('Test Album')).toHaveAttribute(
      'src',
      'http://localhost:32400/library/metadata/123/thumb?X-Plex-Token=test-token'
    );
  });

  it('should render in list view', () => {
    render(<MediaCard {...defaultProps} viewMode="list" />);

    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('should render without thumbnail', () => {
    const itemWithoutThumb = { ...mockItem, thumb: undefined };
    render(<MediaCard {...defaultProps} item={itemWithoutThumb} />);

    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.queryByAltText('Test Album')).not.toBeInTheDocument();
    // Should show placeholder icon
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('should render parent title', () => {
    const itemWithParent = { ...mockItem, parentTitle: 'Artist Name' };
    render(<MediaCard {...defaultProps} item={itemWithParent} />);

    expect(screen.getByText('Artist Name')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<MediaCard {...defaultProps} onClick={onClick} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledWith(mockItem);
  });

  it('should call onClick on Enter key', async () => {
    const onClick = vi.fn();
    render(<MediaCard {...defaultProps} onClick={onClick} />);

    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledWith(mockItem);
  });

  it('should call onClick on Space key', async () => {
    const onClick = vi.fn();
    render(<MediaCard {...defaultProps} onClick={onClick} />);

    const card = screen.getByRole('button');
    card.focus();
    await userEvent.keyboard(' ');

    expect(onClick).toHaveBeenCalledWith(mockItem);
  });

  it('should display duration in list view', () => {
    const itemWithDuration = { ...mockItem, duration: 180000 }; // 3 minutes
    render(<MediaCard {...defaultProps} item={itemWithDuration} viewMode="list" />);

    expect(screen.getByText('3m')).toBeInTheDocument();
  });

  it('should display duration with hours in list view', () => {
    const itemWithDuration = { ...mockItem, duration: 7200000 }; // 2 hours
    render(<MediaCard {...defaultProps} item={itemWithDuration} viewMode="list" />);

    expect(screen.getByText('2h 0m')).toBeInTheDocument();
  });

  it('should display view count in list view', () => {
    const itemWithViews = { ...mockItem, viewCount: 5 };
    render(<MediaCard {...defaultProps} item={itemWithViews} viewMode="list" />);

    expect(screen.getByText('Played 5 times')).toBeInTheDocument();
  });

  it('should display singular view count in list view', () => {
    const itemWithViews = { ...mockItem, viewCount: 1 };
    render(<MediaCard {...defaultProps} item={itemWithViews} viewMode="list" />);

    expect(screen.getByText('Played 1 time')).toBeInTheDocument();
  });

  it('should not display view count when zero', () => {
    const itemWithViews = { ...mockItem, viewCount: 0 };
    render(<MediaCard {...defaultProps} item={itemWithViews} viewMode="list" />);

    expect(screen.queryByText(/Played/)).not.toBeInTheDocument();
  });

  it('should have lazy loading on images', () => {
    render(<MediaCard {...defaultProps} />);

    const img = screen.getByAltText('Test Album');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('should be keyboard accessible', () => {
    render(<MediaCard {...defaultProps} />);

    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('tabIndex', '0');
  });
});
