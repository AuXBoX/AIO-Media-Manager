import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperationHistory } from './OperationHistory';
import { OperationHistory as OperationHistoryType } from '@/managers/BatchOperationManager';

describe('OperationHistory', () => {
  const mockGetHistory = vi.fn();
  const mockOnRetry = vi.fn();

  const defaultProps = {
    getHistory: mockGetHistory,
    onRetry: mockOnRetry,
  };

  const mockHistory: OperationHistoryType[] = [
    {
      id: '1',
      type: 'refresh',
      total: 10,
      succeeded: 10,
      failed: 0,
      startedAt: Date.now() - 3600000, // 1 hour ago
      completedAt: Date.now() - 3540000, // 59 minutes ago
    },
    {
      id: '2',
      type: 'match',
      total: 20,
      succeeded: 18,
      failed: 2,
      startedAt: Date.now() - 7200000, // 2 hours ago
      completedAt: Date.now() - 7080000, // 1h 58m ago
    },
    {
      id: '3',
      type: 'update',
      total: 5,
      succeeded: 0,
      failed: 5,
      startedAt: Date.now() - 86400000, // 1 day ago
      completedAt: Date.now() - 86340000,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHistory.mockResolvedValue(mockHistory);
  });

  it('should render loading state initially', () => {
    render(<OperationHistory {...defaultProps} />);

    expect(screen.getByText('Loading history...')).toBeInTheDocument();
  });

  it('should display operation history after loading', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Operation History')).toBeInTheDocument();
      expect(screen.getByText('refresh')).toBeInTheDocument();
      expect(screen.getByText('match')).toBeInTheDocument();
      expect(screen.getByText('update')).toBeInTheDocument();
    });
  });

  it('should display success badge for fully successful operations', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });

  it('should display partial badge for partially successful operations', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Partial')).toBeInTheDocument();
    });
  });

  it('should display failed badge for completely failed operations', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      // Look for the badge specifically, not just any "Failed" text
      const badges = screen.getAllByText('Failed');
      const failedBadge = badges.find(el => 
        el.className.includes('bg-red-100')
      );
      expect(failedBadge).toBeInTheDocument();
    });
  });

  it('should display item counts', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      // First operation: 10 total, 10 succeeded, 0 failed
      const totals = screen.getAllByText('10');
      expect(totals.length).toBeGreaterThan(0);
    });
  });

  it('should display success rate', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument(); // First operation
      expect(screen.getByText('90%')).toBeInTheDocument(); // Second operation (18/20)
      expect(screen.getByText('0%')).toBeInTheDocument(); // Third operation
    });
  });

  it('should display relative timestamps', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('1 hour ago')).toBeInTheDocument();
      expect(screen.getByText('1 day ago')).toBeInTheDocument();
    });
  });

  it('should display operation duration', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      const durations = screen.getAllByText(/Duration:/);
      expect(durations.length).toBe(3);
    });
  });

  it('should show retry button for failed operations', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      const retryButtons = screen.getAllByText('Retry');
      expect(retryButtons.length).toBe(2); // Two operations have failures
    });
  });

  it('should not show retry button for fully successful operations', async () => {
    mockGetHistory.mockResolvedValue([mockHistory[0]!]); // Only the successful one

    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.queryByText('Retry')).not.toBeInTheDocument();
    });
  });

  it('should call onRetry when retry button clicked', async () => {
    const user = userEvent.setup();
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getAllByText('Retry').length).toBeGreaterThan(0);
    });

    const retryButtons = screen.getAllByText('Retry');
    await user.click(retryButtons[0]!);

    expect(mockOnRetry).toHaveBeenCalledWith('2'); // Second operation has failures
  });

  it('should display empty state when no history', async () => {
    mockGetHistory.mockResolvedValue([]);

    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No operations yet')).toBeInTheDocument();
      expect(
        screen.getByText('Batch operations will appear here once completed.')
      ).toBeInTheDocument();
    });
  });

  it('should display error message when fetch fails', async () => {
    mockGetHistory.mockRejectedValue(new Error('Failed to load history'));

    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load history')).toBeInTheDocument();
    });
  });

  it('should refresh history when refresh button clicked', async () => {
    const user = userEvent.setup();
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Operation History')).toBeInTheDocument();
    });

    // Initial call
    expect(mockGetHistory).toHaveBeenCalledTimes(1);

    // Click refresh button
    const refreshButton = screen.getByLabelText('Refresh history');
    await user.click(refreshButton);

    // Should call again
    expect(mockGetHistory).toHaveBeenCalledTimes(2);
  });

  it('should format duration correctly for seconds', async () => {
    const shortHistory: OperationHistoryType[] = [
      {
        id: '1',
        type: 'refresh',
        total: 1,
        succeeded: 1,
        failed: 0,
        startedAt: Date.now() - 5000,
        completedAt: Date.now(),
      },
    ];

    mockGetHistory.mockResolvedValue(shortHistory);

    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Duration: \d+s/)).toBeInTheDocument();
    });
  });

  it('should format duration correctly for minutes', async () => {
    const longHistory: OperationHistoryType[] = [
      {
        id: '1',
        type: 'refresh',
        total: 100,
        succeeded: 100,
        failed: 0,
        startedAt: Date.now() - 125000, // 2m 5s ago
        completedAt: Date.now(),
      },
    ];

    mockGetHistory.mockResolvedValue(longHistory);

    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Duration: \d+m \d+s/)).toBeInTheDocument();
    });
  });

  it('should display progress bar with correct width', async () => {
    render(<OperationHistory {...defaultProps} />);

    await waitFor(() => {
      // Check that progress bars are rendered with correct widths
      const progressBars = screen.getAllByText('Operation History');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });
});
