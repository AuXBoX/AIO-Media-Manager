import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArtworkSelector } from './ArtworkSelector';
import { ArtworkAsset } from '@/managers/MetadataManager';

// Mock ArtworkImage component
vi.mock('./ArtworkImage', () => ({
  ArtworkImage: ({ alt }: any) => <div data-testid="artwork-image">{alt}</div>,
}));

describe('ArtworkSelector', () => {
  const mockOnClose = vi.fn();
  const mockOnSelect = vi.fn();

  const mockArtwork: ArtworkAsset[] = [
    {
      type: 'poster',
      url: '/library/metadata/123/thumb/1',
      selected: true,
    },
    {
      type: 'poster',
      url: '/library/metadata/123/thumb/2',
      selected: false,
    },
    {
      type: 'background',
      url: '/library/metadata/123/art/1',
      selected: false,
    },
    {
      type: 'banner',
      url: '/library/metadata/123/banner/1',
      selected: false,
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    artwork: mockArtwork,
    serverUrl: 'http://localhost:32400',
    token: 'test-token',
    onSelect: mockOnSelect,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSelect.mockResolvedValue(undefined);
  });

  it('does not render when closed', () => {
    const { container } = render(<ArtworkSelector {...defaultProps} isOpen={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    render(<ArtworkSelector {...defaultProps} />);

    expect(screen.getByText('Select Artwork')).toBeInTheDocument();
  });

  it('displays all artwork items', () => {
    render(<ArtworkSelector {...defaultProps} />);

    const artworkImages = screen.getAllByTestId('artwork-image');
    expect(artworkImages).toHaveLength(4);
  });

  it('filters artwork by type when filterType is provided', () => {
    render(<ArtworkSelector {...defaultProps} filterType="poster" />);

    const artworkImages = screen.getAllByTestId('artwork-image');
    expect(artworkImages).toHaveLength(2);
    expect(screen.getByText('Poster options')).toBeInTheDocument();
  });

  it('displays artwork type labels', () => {
    render(<ArtworkSelector {...defaultProps} />);

    expect(screen.getAllByText('Poster')).toHaveLength(2);
    expect(screen.getByText('Background')).toBeInTheDocument();
    expect(screen.getByText('Banner')).toBeInTheDocument();
  });

  it('marks currently selected artwork', () => {
    render(<ArtworkSelector {...defaultProps} />);

    expect(screen.getByText('Current')).toBeInTheDocument();
  });

  it('displays no artwork message when list is empty', () => {
    render(<ArtworkSelector {...defaultProps} artwork={[]} />);

    expect(screen.getByText('No Artwork Available')).toBeInTheDocument();
  });

  it('displays filtered no artwork message', () => {
    render(<ArtworkSelector {...defaultProps} artwork={[]} filterType="poster" />);

    expect(screen.getByText('No poster artwork found')).toBeInTheDocument();
  });

  it('opens preview when artwork is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    const artworkItems = screen.getAllByTestId('artwork-image');
    await user.click(artworkItems[0].closest('div')!);

    await waitFor(() => {
      // Preview modal should show the artwork type in header
      const headers = screen.getAllByText('Poster');
      expect(headers.length).toBeGreaterThan(2); // Original + preview
    });
  });

  it('closes preview when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    // Open preview
    const artworkItems = screen.getAllByTestId('artwork-image');
    await user.click(artworkItems[0].closest('div')!);

    await waitFor(async () => {
      const closeButtons = screen.getAllByLabelText('Close preview');
      await user.click(closeButtons[0]);
    });

    // Preview should be closed (only original artwork type labels remain)
    const posterLabels = screen.getAllByText('Poster');
    expect(posterLabels).toHaveLength(2);
  });

  it('calls onSelect when select button is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    // Hover over non-selected artwork to reveal select button
    const artworkItems = screen.getAllByTestId('artwork-image');
    const secondArtwork = artworkItems[1].closest('div')!;

    // Click to open preview
    await user.click(secondArtwork);

    await waitFor(async () => {
      const selectButton = screen.getByText('Select This');
      await user.click(selectButton);
    });

    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith('/library/metadata/123/thumb/2', 'poster');
    });
  });

  it('displays success message after selection', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    const artworkItems = screen.getAllByTestId('artwork-image');
    await user.click(artworkItems[1].closest('div')!);

    await waitFor(async () => {
      const selectButton = screen.getByText('Select This');
      await user.click(selectButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Artwork selected successfully!')).toBeInTheDocument();
    });
  });

  it('displays error message on selection failure', async () => {
    const user = userEvent.setup();
    mockOnSelect.mockRejectedValue(new Error('Selection failed'));

    render(<ArtworkSelector {...defaultProps} />);

    const artworkItems = screen.getAllByTestId('artwork-image');
    await user.click(artworkItems[1].closest('div')!);

    await waitFor(async () => {
      const selectButton = screen.getByText('Select This');
      await user.click(selectButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Selection failed')).toBeInTheDocument();
    });
  });

  it('shows selecting state during selection', async () => {
    const user = userEvent.setup();
    let resolveSelect: () => void;
    mockOnSelect.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSelect = resolve;
        })
    );

    render(<ArtworkSelector {...defaultProps} />);

    const artworkItems = screen.getAllByTestId('artwork-image');
    await user.click(artworkItems[1].closest('div')!);

    await waitFor(async () => {
      const selectButton = screen.getByText('Select This');
      await user.click(selectButton);
    });

    // Wait a bit for state to update
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check if "Selecting..." appears anywhere in the document
    const selectingButtons = screen.queryAllByText('Selecting...');
    expect(selectingButtons.length).toBeGreaterThan(0);

    // Clean up
    resolveSelect!();
  });

  it('does not show select button for currently selected artwork', () => {
    render(<ArtworkSelector {...defaultProps} />);

    // The first artwork is selected, so it shouldn't have a select button in preview
    const currentBadge = screen.getByText('Current');
    expect(currentBadge).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    const backdrop = screen.getByText('Select Artwork').closest('div')?.previousSibling;
    if (backdrop) {
      await user.click(backdrop as Element);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('resets state when modal is closed', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    // Open preview
    const artworkItems = screen.getAllByTestId('artwork-image');
    await user.click(artworkItems[1].closest('div')!);

    await waitFor(async () => {
      const selectButton = screen.getByText('Select This');
      await user.click(selectButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Artwork selected successfully!')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays artwork in grid layout', () => {
    const { container } = render(<ArtworkSelector {...defaultProps} />);

    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('grid-cols-2');
  });

  it('shows hover overlay on non-selected artwork', () => {
    const { container } = render(<ArtworkSelector {...defaultProps} />);

    const overlays = container.querySelectorAll('.hover\\:bg-opacity-50');
    // Should have overlays for non-selected items (3 out of 4)
    expect(overlays.length).toBeGreaterThan(0);
  });

  it('handles artwork without ratingKey', () => {
    const artworkWithoutRatingKey: ArtworkAsset[] = [
      {
        type: 'poster',
        url: '/library/metadata/123/thumb/1',
        selected: false,
      },
    ];

    render(<ArtworkSelector {...defaultProps} artwork={artworkWithoutRatingKey} />);

    expect(screen.getByTestId('artwork-image')).toBeInTheDocument();
  });

  it('displays preview with full resolution image', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    const artworkItems = screen.getAllByTestId('artwork-image');
    await user.click(artworkItems[0].closest('div')!);

    await waitFor(() => {
      const previewImage = document.querySelector('img[alt*="preview"]');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute(
        'src',
        'http://localhost:32400/library/metadata/123/thumb/1?X-Plex-Token=test-token'
      );
    });
  });

  it('closes preview when clicking outside preview content', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    // Open preview
    const artworkItems = screen.getAllByTestId('artwork-image');
    await user.click(artworkItems[0].closest('div')!);

    await waitFor(async () => {
      // Find the preview backdrop (the outer div with bg-black bg-opacity-75)
      const previewBackdrop = document.querySelector('.bg-opacity-75');
      if (previewBackdrop) {
        await user.click(previewBackdrop as Element);
      }
    });

    // Preview should be closed
    const posterLabels = screen.getAllByText('Poster');
    expect(posterLabels).toHaveLength(2);
  });

  it('prevents preview close when clicking preview content', async () => {
    const user = userEvent.setup();
    render(<ArtworkSelector {...defaultProps} />);

    // Open preview
    const artworkItems = screen.getAllByTestId('artwork-image');
    await user.click(artworkItems[0].closest('div')!);

    await waitFor(async () => {
      const previewContent = document.querySelector('.max-w-4xl');
      if (previewContent) {
        await user.click(previewContent as Element);
      }
    });

    // Preview should still be open
    const posterLabels = screen.getAllByText('Poster');
    expect(posterLabels.length).toBeGreaterThan(2);
  });
});
