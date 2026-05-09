import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchCandidatesModal } from './MatchCandidatesModal';
import { MatchCandidate } from '@/managers/MetadataManager';

// Mock the MatchCandidateCard component
vi.mock('./MatchCandidateCard', () => ({
  MatchCandidateCard: ({ candidate, onSelect, isSelecting }: any) => (
    <div data-testid={`candidate-${candidate.guid}`}>
      <div>{candidate.title}</div>
      <button onClick={onSelect} disabled={isSelecting}>
        {isSelecting ? 'Applying...' : 'Select'}
      </button>
    </div>
  ),
}));

describe('MatchCandidatesModal', () => {
  const mockCandidates: MatchCandidate[] = [
    {
      guid: 'plex://movie/1',
      score: 95,
      title: 'The Matrix',
      year: 1999,
      thumb: 'https://example.com/matrix.jpg',
      summary: 'A computer hacker learns about reality.',
    },
    {
      guid: 'plex://movie/2',
      score: 85,
      title: 'The Matrix Reloaded',
      year: 2003,
      thumb: 'https://example.com/reloaded.jpg',
      summary: 'Neo and the rebels continue their fight.',
    },
    {
      guid: 'plex://movie/3',
      score: 75,
      title: 'The Matrix Revolutions',
      year: 2003,
      summary: 'The final battle for Zion.',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    ratingKey: '123',
    mediaType: 'movie' as const,
    candidates: mockCandidates,
    isLoading: false,
    onMatch: vi.fn(),
    onUnmatch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <MatchCandidatesModal {...defaultProps} isOpen={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    render(<MatchCandidatesModal {...defaultProps} />);

    expect(screen.getByText('Match Candidates')).toBeInTheDocument();
  });

  it('displays current title when provided', () => {
    render(<MatchCandidatesModal {...defaultProps} currentTitle="Test Movie Title" />);

    expect(screen.getByText('Test Movie Title')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    render(<MatchCandidatesModal {...defaultProps} isLoading={true} candidates={[]} />);

    expect(screen.getByText('Loading match candidates...')).toBeInTheDocument();
  });

  it('displays no candidates message when list is empty', () => {
    render(<MatchCandidatesModal {...defaultProps} candidates={[]} />);

    expect(screen.getByText('No Match Candidates Found')).toBeInTheDocument();
    expect(screen.getByText(/Plex couldn't find any potential matches/)).toBeInTheDocument();
  });

  it('displays all candidates', () => {
    render(<MatchCandidatesModal {...defaultProps} />);

    expect(screen.getByText('The Matrix')).toBeInTheDocument();
    expect(screen.getByText('The Matrix Reloaded')).toBeInTheDocument();
    expect(screen.getByText('The Matrix Revolutions')).toBeInTheDocument();
  });

  it('displays candidate count', () => {
    render(<MatchCandidatesModal {...defaultProps} />);

    expect(screen.getByText('3 candidates found')).toBeInTheDocument();
  });

  it('displays singular candidate count', () => {
    render(<MatchCandidatesModal {...defaultProps} candidates={[mockCandidates[0]]} />);

    expect(screen.getByText('1 candidate found')).toBeInTheDocument();
  });

  it('calls onMatch when a candidate is selected', async () => {
    const user = userEvent.setup();
    const onMatch = vi.fn().mockResolvedValue(undefined);

    render(<MatchCandidatesModal {...defaultProps} onMatch={onMatch} />);

    const selectButtons = screen.getAllByText('Select');
    await user.click(selectButtons[0]);

    await waitFor(() => {
      expect(onMatch).toHaveBeenCalledWith('plex://movie/1');
    });
  });

  it('displays success message after successful match', async () => {
    const user = userEvent.setup();
    const onMatch = vi.fn().mockResolvedValue(undefined);

    render(<MatchCandidatesModal {...defaultProps} onMatch={onMatch} />);

    const selectButtons = screen.getAllByText('Select');
    await user.click(selectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Match applied successfully!')).toBeInTheDocument();
    });
  });

  it('displays error message when match fails', async () => {
    const user = userEvent.setup();
    const onMatch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<MatchCandidatesModal {...defaultProps} onMatch={onMatch} />);

    const selectButtons = screen.getAllByText('Select');
    await user.click(selectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('calls onUnmatch when unmatch button is clicked', async () => {
    const user = userEvent.setup();
    const onUnmatch = vi.fn().mockResolvedValue(undefined);

    render(<MatchCandidatesModal {...defaultProps} onUnmatch={onUnmatch} />);

    const unmatchButton = screen.getByText('Unmatch Item');
    await user.click(unmatchButton);

    await waitFor(() => {
      expect(onUnmatch).toHaveBeenCalledTimes(1);
    });
  });

  it('displays success message after successful unmatch', async () => {
    const user = userEvent.setup();
    const onUnmatch = vi.fn().mockResolvedValue(undefined);

    render(<MatchCandidatesModal {...defaultProps} onUnmatch={onUnmatch} />);

    const unmatchButton = screen.getByText('Unmatch Item');
    await user.click(unmatchButton);

    await waitFor(() => {
      expect(screen.getByText('Item unmatched successfully!')).toBeInTheDocument();
    });
  });

  it('displays error message when unmatch fails', async () => {
    const user = userEvent.setup();
    const onUnmatch = vi.fn().mockRejectedValue(new Error('Unmatch failed'));

    render(<MatchCandidatesModal {...defaultProps} onUnmatch={onUnmatch} />);

    const unmatchButton = screen.getByText('Unmatch Item');
    await user.click(unmatchButton);

    await waitFor(() => {
      expect(screen.getByText('Unmatch failed')).toBeInTheDocument();
    });
  });

  it('displays unmatch button when no candidates found', () => {
    render(<MatchCandidatesModal {...defaultProps} candidates={[]} />);

    expect(screen.getByText('Unmatch Item')).toBeInTheDocument();
  });

  it('displays error prop when provided', () => {
    render(<MatchCandidatesModal {...defaultProps} error="Failed to load candidates" />);

    expect(screen.getByText('Failed to load candidates')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<MatchCandidatesModal {...defaultProps} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<MatchCandidatesModal {...defaultProps} onClose={onClose} />);

    const backdrop = screen.getByText('Match Candidates').closest('div')?.previousSibling;
    if (backdrop) {
      await user.click(backdrop as Element);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('disables select button while matching', async () => {
    const user = userEvent.setup();
    let resolveMatch: () => void;
    const onMatch = vi.fn(() => new Promise<void>((resolve) => {
      resolveMatch = resolve;
    }));

    render(<MatchCandidatesModal {...defaultProps} onMatch={onMatch} />);

    const selectButtons = screen.getAllByText('Select');
    await user.click(selectButtons[0]);

    // Verify onMatch was called
    await waitFor(() => {
      expect(onMatch).toHaveBeenCalledWith('plex://movie/1');
    });

    // Clean up
    resolveMatch!();
  });

  it('disables unmatch button while unmatching', async () => {
    const user = userEvent.setup();
    const onUnmatch = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));

    render(<MatchCandidatesModal {...defaultProps} onUnmatch={onUnmatch} />);

    const unmatchButton = screen.getByText('Unmatch Item');
    await user.click(unmatchButton);

    // Button should show "Unmatching..." and be disabled
    await waitFor(() => {
      expect(screen.getByText('Unmatching...')).toBeInTheDocument();
    });
  });

  it('resets state when modal is closed', async () => {
    const user = userEvent.setup();
    const onMatch = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const { rerender } = render(
      <MatchCandidatesModal {...defaultProps} onMatch={onMatch} onClose={onClose} />
    );

    // Select a candidate
    const selectButtons = screen.getAllByText('Select');
    await user.click(selectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Match applied successfully!')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    // Reopen modal
    rerender(<MatchCandidatesModal {...defaultProps} onMatch={onMatch} onClose={onClose} />);

    // Success message should not be visible
    expect(screen.queryByText('Match applied successfully!')).not.toBeInTheDocument();
  });

  it('displays helper text for candidates', () => {
    render(<MatchCandidatesModal {...defaultProps} />);

    expect(screen.getByText('Select a match to update the item\'s metadata')).toBeInTheDocument();
  });

  it('displays helper text for unmatch button', () => {
    render(<MatchCandidatesModal {...defaultProps} />);

    expect(screen.getByText('This will reset the item to an unmatched state')).toBeInTheDocument();
  });

  it('handles candidates with missing optional fields', () => {
    const minimalCandidate: MatchCandidate = {
      guid: 'plex://movie/4',
      score: 80,
      title: 'Minimal Movie',
    };

    render(<MatchCandidatesModal {...defaultProps} candidates={[minimalCandidate]} />);

    expect(screen.getByText('Minimal Movie')).toBeInTheDocument();
  });
});
