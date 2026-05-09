import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import type { ConflictResolution } from '@/managers/CacheManager';

describe('ConflictResolutionModal', () => {
  const createMockConflict = (ratingKey: string, title = 'Test Movie'): ConflictResolution => ({
    ratingKey,
    localChange: { title, year: 2023, summary: 'Local summary' },
    serverValue: { title: 'Server Title', year: 2024, summary: 'Server summary' },
    resolution: 'manual',
  });

  describe('Modal Display', () => {
    it('should not render when isOpen is false', () => {
      render(
        <ConflictResolutionModal
          isOpen={false}
          onClose={vi.fn()}
          conflicts={[]}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.queryByText('Resolve Sync Conflicts')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByText('Resolve Sync Conflicts')).toBeInTheDocument();
    });

    it('should display conflict count and resolution progress', () => {
      const conflicts = [createMockConflict('123'), createMockConflict('456')];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByText(/2 items have conflicting changes/)).toBeInTheDocument();
      expect(screen.getByText(/0 of 2 resolved/)).toBeInTheDocument();
    });

    it('should display singular text for single conflict', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByText(/1 item has conflicting changes/)).toBeInTheDocument();
    });
  });

  describe('Conflict Display', () => {
    it('should display current conflict with title', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123', 'Test Movie')]}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByRole('heading', { name: 'Test Movie' })).toBeInTheDocument();
      expect(screen.getByText(/Rating Key: 123/)).toBeInTheDocument();
    });

    it('should display conflicting fields', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      // Should show field labels
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Year')).toBeInTheDocument();
      expect(screen.getByText('Summary')).toBeInTheDocument();
    });

    it('should display local and server values for each field', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      // Check for local values
      expect(screen.getByText('Local summary')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
      
      // Check for server values
      expect(screen.getByText('Server summary')).toBeInTheDocument();
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('should show conflicting fields count', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      // Title, year, and summary are different = 3 conflicting fields
      expect(screen.getByText(/Conflicting Fields \(3\)/)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should show navigation controls for multiple conflicts', () => {
      const conflicts = [createMockConflict('123'), createMockConflict('456')];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('should not show navigation for single conflict', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });

    it('should navigate to next conflict', async () => {
      const user = userEvent.setup();
      const conflicts = [
        createMockConflict('123', 'Movie 1'),
        createMockConflict('456', 'Movie 2'),
      ];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByRole('heading', { name: 'Movie 1' })).toBeInTheDocument();
      
      await user.click(screen.getByText('Next'));
      
      expect(screen.getByRole('heading', { name: 'Movie 2' })).toBeInTheDocument();
      expect(screen.getByText('2 of 2')).toBeInTheDocument();
    });

    it('should navigate to previous conflict', async () => {
      const user = userEvent.setup();
      const conflicts = [
        createMockConflict('123', 'Movie 1'),
        createMockConflict('456', 'Movie 2'),
      ];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      // Go to second conflict
      await user.click(screen.getByText('Next'));
      expect(screen.getByRole('heading', { name: 'Movie 2' })).toBeInTheDocument();
      
      // Go back to first
      await user.click(screen.getByText('Previous'));
      expect(screen.getByRole('heading', { name: 'Movie 1' })).toBeInTheDocument();
    });

    it('should disable previous button on first conflict', () => {
      const conflicts = [createMockConflict('123'), createMockConflict('456')];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      const previousButton = screen.getByText('Previous').closest('button');
      expect(previousButton).toBeDisabled();
    });

    it('should disable next button on last conflict', async () => {
      const user = userEvent.setup();
      const conflicts = [createMockConflict('123'), createMockConflict('456')];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      await user.click(screen.getByText('Next'));
      
      const nextButton = screen.getByText('Next').closest('button');
      expect(nextButton).toBeDisabled();
    });
  });

  describe('Individual Resolution', () => {
    it('should allow selecting local resolution', async () => {
      const user = userEvent.setup();
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      const localButton = screen.getByRole('button', { name: /keep my changes/i });
      await user.click(localButton);
      
      // Button should be highlighted
      expect(localButton).toHaveClass('bg-blue-600');
    });

    it('should allow selecting server resolution', async () => {
      const user = userEvent.setup();
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      const serverButton = screen.getByRole('button', { name: /use server version/i });
      await user.click(serverButton);
      
      // Button should be highlighted
      expect(serverButton).toHaveClass('bg-gray-600');
    });

    it('should update resolution progress', async () => {
      const user = userEvent.setup();
      const conflicts = [createMockConflict('123'), createMockConflict('456')];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByText(/0 of 2 resolved/)).toBeInTheDocument();
      
      await user.click(screen.getByRole('button', { name: /keep my changes/i }));
      
      expect(screen.getByText(/1 of 2 resolved/)).toBeInTheDocument();
    });
  });

  describe('Bulk Resolution', () => {
    it('should resolve all conflicts to local', async () => {
      const user = userEvent.setup();
      const conflicts = [createMockConflict('123'), createMockConflict('456')];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      const bulkLocalButton = screen.getByRole('button', { name: /keep all local changes/i });
      await user.click(bulkLocalButton);
      
      // Should show all resolved
      expect(screen.getByText(/2 of 2 resolved/)).toBeInTheDocument();
    });

    it('should resolve all conflicts to server', async () => {
      const user = userEvent.setup();
      const conflicts = [createMockConflict('123'), createMockConflict('456')];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      const bulkServerButton = screen.getByRole('button', { name: /use all server versions/i });
      await user.click(bulkServerButton);
      
      // Should show all resolved
      expect(screen.getByText(/2 of 2 resolved/)).toBeInTheDocument();
    });
  });

  describe('Apply Resolutions', () => {
    it('should call onResolve with resolutions when apply is clicked', async () => {
      const user = userEvent.setup();
      const onResolve = vi.fn().mockResolvedValue(undefined);
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={onResolve}
        />
      );
      
      // Select resolution
      await user.click(screen.getByRole('button', { name: /keep my changes/i }));
      
      // Apply
      await user.click(screen.getByRole('button', { name: /apply resolutions/i }));
      
      await waitFor(() => {
        expect(onResolve).toHaveBeenCalledTimes(1);
      });
      
      const resolutions = onResolve.mock.calls[0][0];
      expect(resolutions.get('123')).toBe('local');
    });

    it('should disable apply button until all conflicts are resolved', () => {
      const conflicts = [createMockConflict('123'), createMockConflict('456')];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      const applyButton = screen.getByRole('button', { name: /apply resolutions/i });
      expect(applyButton).toBeDisabled();
    });

    it('should enable apply button when all conflicts are resolved', async () => {
      const user = userEvent.setup();
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      const applyButton = screen.getByRole('button', { name: /apply resolutions/i });
      expect(applyButton).toBeDisabled();
      
      // Resolve conflict
      await user.click(screen.getByRole('button', { name: /keep my changes/i }));
      
      expect(applyButton).not.toBeDisabled();
    });

    it('should show loading state while resolving', async () => {
      const user = userEvent.setup();
      const onResolve = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={onResolve}
        />
      );
      
      // Resolve and apply
      await user.click(screen.getByRole('button', { name: /keep my changes/i }));
      await user.click(screen.getByRole('button', { name: /apply resolutions/i }));
      
      expect(screen.getByText('Resolving...')).toBeInTheDocument();
    });

    it('should close modal after successful resolution', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onResolve = vi.fn().mockResolvedValue(undefined);
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={onClose}
          conflicts={[createMockConflict('123')]}
          onResolve={onResolve}
        />
      );
      
      // Resolve and apply
      await user.click(screen.getByRole('button', { name: /keep my changes/i }));
      await user.click(screen.getByRole('button', { name: /apply resolutions/i }));
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should display error message if resolution fails', async () => {
      const user = userEvent.setup();
      const onResolve = vi.fn().mockRejectedValue(new Error('Sync failed'));
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={onResolve}
        />
      );
      
      // Resolve and apply
      await user.click(screen.getByRole('button', { name: /keep my changes/i }));
      await user.click(screen.getByRole('button', { name: /apply resolutions/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Sync failed')).toBeInTheDocument();
      });
    });

    it('should show completion status when all resolved', async () => {
      const user = userEvent.setup();
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      await user.click(screen.getByRole('button', { name: /keep my changes/i }));
      
      expect(screen.getByText(/✓ All conflicts resolved/)).toBeInTheDocument();
    });

    it('should show remaining conflicts count', () => {
      const conflicts = [createMockConflict('123'), createMockConflict('456')];
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={conflicts}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByText(/2 conflicts remaining/)).toBeInTheDocument();
    });
  });

  describe('Modal Close', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={onClose}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={onClose}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not allow closing while resolving', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onResolve = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={onClose}
          conflicts={[createMockConflict('123')]}
          onResolve={onResolve}
        />
      );
      
      // Start resolving
      await user.click(screen.getByRole('button', { name: /keep my changes/i }));
      await user.click(screen.getByRole('button', { name: /apply resolutions/i }));
      
      // Try to close
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeDisabled();
    });

    it('should reset state when closed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const { rerender } = render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={onClose}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      // Select resolution
      await user.click(screen.getByRole('button', { name: /keep my changes/i }));
      
      // Close
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      
      // Reopen
      rerender(
        <ConflictResolutionModal
          isOpen={true}
          onClose={onClose}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      // Resolution should be cleared
      const applyButton = screen.getByRole('button', { name: /apply resolutions/i });
      expect(applyButton).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByRole('heading', { name: /resolve sync conflicts/i })).toBeInTheDocument();
    });

    it('should have accessible close button', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[createMockConflict('123')]}
          onResolve={vi.fn()}
        />
      );
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty conflicts array', () => {
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[]}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByText(/0 items have conflicting changes/)).toBeInTheDocument();
    });

    it('should handle conflicts with missing title', () => {
      const conflict: ConflictResolution = {
        ratingKey: '123',
        localChange: { year: 2023 },
        serverValue: { year: 2024 },
        resolution: 'manual',
      };
      
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[conflict]}
          onResolve={vi.fn()}
        />
      );
      
      // Should fall back to rating key
      expect(screen.getByText('Item 123')).toBeInTheDocument();
    });

    it('should handle empty field values', () => {
      const conflict: ConflictResolution = {
        ratingKey: '123',
        localChange: { title: 'Test', summary: null },
        serverValue: { title: 'Test', summary: undefined },
        resolution: 'manual',
      };
      
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[conflict]}
          onResolve={vi.fn()}
        />
      );
      
      // Should show (empty) for null/undefined values
      const emptyElements = screen.getAllByText('(empty)');
      expect(emptyElements.length).toBeGreaterThan(0);
    });

    it('should handle array field values', () => {
      const conflict: ConflictResolution = {
        ratingKey: '123',
        localChange: {
          title: 'Test',
          genres: [{ tag: 'Action' }, { tag: 'Drama' }],
        },
        serverValue: {
          title: 'Test',
          genres: [{ tag: 'Comedy' }],
        },
        resolution: 'manual',
      };
      
      render(
        <ConflictResolutionModal
          isOpen={true}
          onClose={vi.fn()}
          conflicts={[conflict]}
          onResolve={vi.fn()}
        />
      );
      
      expect(screen.getByText('Action, Drama')).toBeInTheDocument();
      expect(screen.getByText('Comedy')).toBeInTheDocument();
    });
  });
});
