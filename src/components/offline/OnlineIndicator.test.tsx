import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnlineIndicator } from './OnlineIndicator';

describe('OnlineIndicator', () => {
  describe('Online Status Display', () => {
    it('should display "Online" when isOnline is true', () => {
      render(<OnlineIndicator isOnline={true} />);
      
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should display "Offline" when isOnline is false', () => {
      render(<OnlineIndicator isOnline={false} />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should display "Syncing..." when isSyncing is true', () => {
      render(<OnlineIndicator isOnline={true} isSyncing={true} />);
      
      expect(screen.getByText('Syncing...')).toBeInTheDocument();
    });

    it('should show green dot when online', () => {
      const { container } = render(<OnlineIndicator isOnline={true} />);
      
      const greenDot = container.querySelector('.bg-green-500');
      expect(greenDot).toBeInTheDocument();
    });

    it('should show gray dot when offline', () => {
      const { container } = render(<OnlineIndicator isOnline={false} />);
      
      const grayDot = container.querySelector('.bg-gray-400');
      expect(grayDot).toBeInTheDocument();
    });

    it('should show pulsing animation when syncing', () => {
      const { container } = render(<OnlineIndicator isOnline={true} isSyncing={true} />);
      
      const pulsingDot = container.querySelector('.animate-ping');
      expect(pulsingDot).toBeInTheDocument();
    });
  });

  describe('Details Dropdown', () => {
    it('should toggle details dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<OnlineIndicator isOnline={true} />);
      
      const button = screen.getByRole('button', { name: /online/i });
      
      // Initially closed
      expect(screen.queryByText('Connection Status')).not.toBeInTheDocument();
      
      // Click to open
      await user.click(button);
      expect(screen.getByText('Connection Status')).toBeInTheDocument();
      
      // Click to close
      await user.click(button);
      await waitFor(() => {
        expect(screen.queryByText('Connection Status')).not.toBeInTheDocument();
      });
    });

    it('should display connection status in dropdown', async () => {
      const user = userEvent.setup();
      render(<OnlineIndicator isOnline={true} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('Connection Status')).toBeInTheDocument();
      expect(screen.getByText('Connected to server')).toBeInTheDocument();
    });

    it('should display offline message in dropdown when offline', async () => {
      const user = userEvent.setup();
      render(<OnlineIndicator isOnline={false} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('Working offline')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      const { container } = render(<OnlineIndicator isOnline={true} />);
      
      // Open dropdown
      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Connection Status')).toBeInTheDocument();
      
      // Click outside (on the backdrop)
      const backdrop = container.querySelector('.fixed.inset-0');
      if (backdrop) {
        await user.click(backdrop);
      }
      
      await waitFor(() => {
        expect(screen.queryByText('Connection Status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Last Sync Display', () => {
    it('should display "Never" when lastSyncTime is undefined', async () => {
      const user = userEvent.setup();
      render(<OnlineIndicator isOnline={true} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('Never')).toBeInTheDocument();
    });

    it('should display "Just now" for recent sync', async () => {
      const user = userEvent.setup();
      const now = Date.now();
      render(<OnlineIndicator isOnline={true} lastSyncTime={now} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('Just now')).toBeInTheDocument();
    });

    it('should display minutes ago for sync within last hour', async () => {
      const user = userEvent.setup();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      render(<OnlineIndicator isOnline={true} lastSyncTime={fiveMinutesAgo} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('should display hours ago for sync within last day', async () => {
      const user = userEvent.setup();
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      render(<OnlineIndicator isOnline={true} lastSyncTime={twoHoursAgo} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('should display days ago for older sync', async () => {
      const user = userEvent.setup();
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      render(<OnlineIndicator isOnline={true} lastSyncTime={threeDaysAgo} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });
  });

  describe('Sync Status', () => {
    it('should display syncing indicator when isSyncing is true', async () => {
      const user = userEvent.setup();
      render(<OnlineIndicator isOnline={true} isSyncing={true} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText('Syncing changes...')).toBeInTheDocument();
    });

    it('should show spinner when syncing', async () => {
      const user = userEvent.setup();
      const { container } = render(<OnlineIndicator isOnline={true} isSyncing={true} />);
      
      await user.click(screen.getByRole('button'));
      
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Manual Sync Button', () => {
    it('should display sync button when onManualSync is provided and online', async () => {
      const user = userEvent.setup();
      const onManualSync = vi.fn();
      render(<OnlineIndicator isOnline={true} onManualSync={onManualSync} />);
      
      await user.click(screen.getByRole('button', { name: /online/i }));
      
      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    });

    it('should not display sync button when offline', async () => {
      const user = userEvent.setup();
      const onManualSync = vi.fn();
      render(<OnlineIndicator isOnline={false} onManualSync={onManualSync} />);
      
      await user.click(screen.getByRole('button', { name: /offline/i }));
      
      expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
    });

    it('should not display sync button when syncing', async () => {
      const user = userEvent.setup();
      const onManualSync = vi.fn();
      render(<OnlineIndicator isOnline={true} isSyncing={true} onManualSync={onManualSync} />);
      
      // The button text changes to "Syncing..." but aria-label stays "Online"
      await user.click(screen.getByRole('button', { name: /online/i }));
      
      expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
    });

    it('should call onManualSync when sync button is clicked', async () => {
      const user = userEvent.setup();
      const onManualSync = vi.fn();
      render(<OnlineIndicator isOnline={true} onManualSync={onManualSync} />);
      
      await user.click(screen.getByRole('button', { name: /online/i }));
      await user.click(screen.getByRole('button', { name: /sync now/i }));
      
      expect(onManualSync).toHaveBeenCalledTimes(1);
    });

    it('should close dropdown after clicking sync button', async () => {
      const user = userEvent.setup();
      const onManualSync = vi.fn();
      render(<OnlineIndicator isOnline={true} onManualSync={onManualSync} />);
      
      await user.click(screen.getByRole('button', { name: /online/i }));
      await user.click(screen.getByRole('button', { name: /sync now/i }));
      
      await waitFor(() => {
        expect(screen.queryByText('Connection Status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Offline Message', () => {
    it('should display offline message when offline', async () => {
      const user = userEvent.setup();
      render(<OnlineIndicator isOnline={false} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.getByText(/changes will sync automatically/i)).toBeInTheDocument();
    });

    it('should not display offline message when online', async () => {
      const user = userEvent.setup();
      render(<OnlineIndicator isOnline={true} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.queryByText(/changes will sync automatically/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<OnlineIndicator isOnline={true} />);
      
      const button = screen.getByRole('button', { name: /online/i });
      expect(button).toHaveAttribute('aria-label', 'Online');
    });

    it('should have proper aria-label when offline', () => {
      render(<OnlineIndicator isOnline={false} />);
      
      const button = screen.getByRole('button', { name: /offline/i });
      expect(button).toHaveAttribute('aria-label', 'Offline');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<OnlineIndicator isOnline={true} />);
      
      const button = screen.getByRole('button');
      
      // Tab to button
      await user.tab();
      expect(button).toHaveFocus();
      
      // Press Enter to open
      await user.keyboard('{Enter}');
      expect(screen.getByText('Connection Status')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid status changes', async () => {
      const { rerender } = render(<OnlineIndicator isOnline={true} />);
      
      expect(screen.getByText('Online')).toBeInTheDocument();
      
      rerender(<OnlineIndicator isOnline={false} />);
      expect(screen.getByText('Offline')).toBeInTheDocument();
      
      rerender(<OnlineIndicator isOnline={true} />);
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    it('should handle missing onManualSync gracefully', async () => {
      const user = userEvent.setup();
      render(<OnlineIndicator isOnline={true} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
    });
  });
});
