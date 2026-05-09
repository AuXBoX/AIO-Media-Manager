import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncButton } from './SyncButton';

describe('SyncButton', () => {
  describe('Button Display', () => {
    it('should display "Sync Now" text by default', () => {
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
        />
      );
      
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });

    it('should display "Syncing..." when syncing', () => {
      render(
        <SyncButton
          isSyncing={true}
          isOnline={true}
          onSync={vi.fn()}
        />
      );
      
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('should display pending changes count', () => {
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          pendingChanges={5}
          onSync={vi.fn()}
        />
      );
      
      expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
    });

    it('should not display count when syncing', () => {
      render(
        <SyncButton
          isSyncing={true}
          isOnline={true}
          pendingChanges={5}
          onSync={vi.fn()}
        />
      );
      
      expect(screen.queryByText(/\(5\)/)).not.toBeInTheDocument();
    });
  });

  describe('Button State', () => {
    it('should be enabled when online and not syncing', () => {
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should be disabled when offline', () => {
      render(
        <SyncButton
          isSyncing={false}
          isOnline={false}
          onSync={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when syncing', () => {
      render(
        <SyncButton
          isSyncing={true}
          isOnline={true}
          onSync={vi.fn()}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Sync Action', () => {
    it('should call onSync when clicked', async () => {
      const user = userEvent.setup();
      const onSync = vi.fn();
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={onSync}
        />
      );
      
      await user.click(screen.getByRole('button'));
      
      expect(onSync).toHaveBeenCalledTimes(1);
    });

    it('should not call onSync when disabled', async () => {
      const user = userEvent.setup();
      const onSync = vi.fn();
      render(
        <SyncButton
          isSyncing={false}
          isOnline={false}
          onSync={onSync}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(onSync).not.toHaveBeenCalled();
    });
  });

  describe('Spinner Animation', () => {
    it('should show spinner when syncing', () => {
      const { container } = render(
        <SyncButton
          isSyncing={true}
          isOnline={true}
          onSync={vi.fn()}
        />
      );
      
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show spinner when not syncing', () => {
      const { container } = render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
        />
      );
      
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('Variant Styles', () => {
    it('should apply primary variant styles', () => {
      const { container } = render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
          variant="primary"
        />
      );
      
      const button = container.querySelector('.bg-blue-600');
      expect(button).toBeInTheDocument();
    });

    it('should apply secondary variant styles', () => {
      const { container } = render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
          variant="secondary"
        />
      );
      
      const button = container.querySelector('.bg-gray-200');
      expect(button).toBeInTheDocument();
    });

    it('should apply icon variant styles', () => {
      const { container } = render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
          variant="icon"
        />
      );
      
      const button = container.querySelector('.bg-transparent');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      const { container } = render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
          size="sm"
        />
      );
      
      const button = container.querySelector('.text-sm');
      expect(button).toBeInTheDocument();
    });

    it('should apply medium size classes', () => {
      const { container } = render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
          size="md"
        />
      );
      
      const button = container.querySelector('.text-base');
      expect(button).toBeInTheDocument();
    });

    it('should apply large size classes', () => {
      const { container } = render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
          size="lg"
        />
      );
      
      const button = container.querySelector('.text-lg');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Icon Variant', () => {
    it('should not display text in icon variant', () => {
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
          variant="icon"
        />
      );
      
      expect(screen.queryByText('Sync Now')).not.toBeInTheDocument();
    });

    it('should display pending changes badge in icon variant', () => {
      const { container } = render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          pendingChanges={5}
          onSync={vi.fn()}
          variant="icon"
        />
      );
      
      const badge = container.querySelector('.bg-red-500');
      expect(badge).toBeInTheDocument();
      expect(badge?.textContent).toBe('5');
    });

    it('should display "9+" for more than 9 pending changes', () => {
      const { container } = render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          pendingChanges={15}
          onSync={vi.fn()}
          variant="icon"
        />
      );
      
      const badge = container.querySelector('.bg-red-500');
      expect(badge?.textContent).toBe('9+');
    });

    it('should not display badge when syncing', () => {
      const { container } = render(
        <SyncButton
          isSyncing={true}
          isOnline={true}
          pendingChanges={5}
          onSync={vi.fn()}
          variant="icon"
        />
      );
      
      const badge = container.querySelector('.bg-red-500');
      expect(badge).not.toBeInTheDocument();
    });

    it('should show tooltip on hover', async () => {
      const user = userEvent.setup();
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          pendingChanges={3}
          onSync={vi.fn()}
          variant="icon"
        />
      );
      
      const button = screen.getByRole('button');
      await user.hover(button);
      
      // Tooltip should be in the DOM after hover
      await waitFor(() => {
        const tooltip = screen.queryByText('Sync 3 changes');
        expect(tooltip).not.toBeNull();
      });
    });

    it('should hide tooltip on mouse leave', async () => {
      const user = userEvent.setup();
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          pendingChanges={3}
          onSync={vi.fn()}
          variant="icon"
        />
      );
      
      const button = screen.getByRole('button');
      await user.hover(button);
      
      await waitFor(() => {
        expect(screen.queryByText('Sync 3 changes')).not.toBeNull();
      });
      
      await user.unhover(button);
      
      await waitFor(() => {
        expect(screen.queryByText('Sync 3 changes')).toBeNull();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label in icon variant', () => {
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
          variant="icon"
        />
      );
      
      const button = screen.getByRole('button', { name: /sync changes/i });
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const onSync = vi.fn();
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={onSync}
        />
      );
      
      const button = screen.getByRole('button');
      
      // Tab to button
      await user.tab();
      expect(button).toHaveFocus();
      
      // Press Enter
      await user.keyboard('{Enter}');
      expect(onSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero pending changes', () => {
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          pendingChanges={0}
          onSync={vi.fn()}
        />
      );
      
      expect(screen.queryByText(/\(0\)/)).not.toBeInTheDocument();
    });

    it('should handle undefined pending changes', () => {
      render(
        <SyncButton
          isSyncing={false}
          isOnline={true}
          onSync={vi.fn()}
        />
      );
      
      expect(screen.getByText('Sync Now')).toBeInTheDocument();
    });

    it('should handle all props together', () => {
      render(
        <SyncButton
          isSyncing={true}
          isOnline={true}
          pendingChanges={10}
          onSync={vi.fn()}
          variant="primary"
          size="lg"
        />
      );
      
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });
  });
});
