import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PinDisplay } from './PinDisplay';
import type { PinResponse } from '@/managers/AuthenticationManager';

describe('PinDisplay', () => {
  const createMockPin = (expiresInSeconds: number = 300): PinResponse => {
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    return {
      id: 12345,
      code: 'ABCD',
      expiresAt,
    };
  };

  describe('Loading State', () => {
    it('should display loading spinner when loading is true', () => {
      render(<PinDisplay pin={null} loading={true} />);
      
      expect(screen.getByText('Generating PIN...')).toBeInTheDocument();
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should not display PIN when loading', () => {
      const pin = createMockPin();
      render(<PinDisplay pin={pin} loading={true} />);
      
      expect(screen.queryByText('A')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when error is provided', () => {
      const errorMessage = 'Failed to generate PIN';
      render(<PinDisplay pin={null} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should display Try Again button when error and onRefresh provided', async () => {
      const onRefresh = vi.fn();
      const user = userEvent.setup();
      
      render(<PinDisplay pin={null} error="Error" onRefresh={onRefresh} />);
      
      const button = screen.getByRole('button', { name: /try again/i });
      await user.click(button);
      
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should not display Try Again button when onRefresh is not provided', () => {
      render(<PinDisplay pin={null} error="Error" />);
      
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('No PIN State', () => {
    it('should display "No PIN available" when pin is null', () => {
      render(<PinDisplay pin={null} />);
      
      expect(screen.getByText('No PIN available')).toBeInTheDocument();
    });

    it('should display Generate PIN button when onRefresh provided', async () => {
      const onRefresh = vi.fn();
      const user = userEvent.setup();
      
      render(<PinDisplay pin={null} onRefresh={onRefresh} />);
      
      const button = screen.getByRole('button', { name: /generate pin/i });
      await user.click(button);
      
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('PIN Display', () => {
    it('should display the PIN code in separate boxes', () => {
      const pin = createMockPin();
      render(<PinDisplay pin={pin} />);
      
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });

    it('should display instructions with link to Plex auth page', () => {
      const pin = createMockPin();
      render(<PinDisplay pin={pin} />);
      
      expect(screen.getByText('Authenticate with Plex')).toBeInTheDocument();
      
      const link = screen.getByRole('link', { name: /app\.plex\.tv\/auth/i });
      expect(link).toHaveAttribute('href', 'https://app.plex.tv/auth');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should display additional instructions when PIN is not expired', () => {
      const pin = createMockPin();
      render(<PinDisplay pin={pin} />);
      
      expect(screen.getByText(/after entering the pin/i)).toBeInTheDocument();
    });
  });

  describe('Expiration Timer', () => {
    it('should display time remaining in MM:SS format', () => {
      const pin = createMockPin(300); // 5 minutes
      render(<PinDisplay pin={pin} />);
      
      expect(screen.getByText(/expires in:/i)).toBeInTheDocument();
      // Timer may tick down by 1 second, so check for 5:00 or 4:59
      expect(screen.getByText(/[45]:[0-5][0-9]/)).toBeInTheDocument();
    });

    it('should format time with leading zero for seconds', () => {
      const pin = createMockPin(65); // 1:05
      render(<PinDisplay pin={pin} />);
      
      // Timer may tick down, so check for 1:05 or 1:04
      expect(screen.getByText(/1:0[45]/)).toBeInTheDocument();
    });

    it('should display initial time correctly for short durations', () => {
      const pin = createMockPin(10); // 10 seconds
      render(<PinDisplay pin={pin} />);
      
      // Timer may tick down, so check for 0:10 or 0:09
      expect(screen.getByText(/0:0[89]|0:10/)).toBeInTheDocument();
    });
  });

  describe('Expired PIN', () => {
    it('should display "PIN Expired" for already expired PIN', () => {
      const pin = createMockPin(-10); // Already expired
      render(<PinDisplay pin={pin} />);
      
      expect(screen.getByText('PIN Expired')).toBeInTheDocument();
    });

    it('should display Refresh PIN button when expired and onRefresh provided', () => {
      const onRefresh = vi.fn();
      const pin = createMockPin(-1); // Already expired
      
      render(<PinDisplay pin={pin} onRefresh={onRefresh} />);
      
      expect(screen.getByRole('button', { name: /refresh pin/i })).toBeInTheDocument();
    });

    it('should call onRefresh when Refresh PIN button is clicked', async () => {
      const onRefresh = vi.fn();
      const user = userEvent.setup();
      const pin = createMockPin(-1); // Already expired
      
      render(<PinDisplay pin={pin} onRefresh={onRefresh} />);
      
      const button = screen.getByRole('button', { name: /refresh pin/i });
      await user.click(button);
      
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should not display additional instructions when expired', () => {
      const pin = createMockPin(-1); // Already expired
      render(<PinDisplay pin={pin} />);
      
      expect(screen.queryByText(/after entering the pin/i)).not.toBeInTheDocument();
    });

    it('should change PIN box styling when expired', () => {
      const pin = createMockPin(-1); // Already expired
      const { container } = render(<PinDisplay pin={pin} />);
      
      // PIN boxes should have gray styling when expired
      const expiredBoxes = container.querySelectorAll('div[class*="bg-gray"]');
      expect(expiredBoxes.length).toBeGreaterThan(0);
    });
  });

  describe('Timer Cleanup', () => {
    it('should clean up timer on unmount', () => {
      const pin = createMockPin();
      const { unmount } = render(<PinDisplay pin={pin} />);
      
      // Timer may tick down, so check for 5:00 or 4:59
      expect(screen.getByText(/[45]:[0-5][0-9]/)).toBeInTheDocument();
      
      // Should not throw error on unmount
      expect(() => unmount()).not.toThrow();
    });

    it('should handle PIN change', () => {
      const pin1 = createMockPin(10);
      const { rerender } = render(<PinDisplay pin={pin1} />);
      
      // Timer may tick down
      expect(screen.getByText(/0:0[89]|0:10/)).toBeInTheDocument();
      
      // Change to new PIN with different expiration
      const pin2 = createMockPin(20);
      rerender(<PinDisplay pin={pin2} />);
      
      // Should show new time (may tick down)
      expect(screen.getByText(/0:(19|20)/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      const pin = createMockPin();
      render(<PinDisplay pin={pin} />);
      
      const heading = screen.getByRole('heading', { name: /authenticate with plex/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible link with proper attributes', () => {
      const pin = createMockPin();
      render(<PinDisplay pin={pin} />);
      
      const link = screen.getByRole('link', { name: /app\.plex\.tv\/auth/i });
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should have accessible buttons when expired', () => {
      const onRefresh = vi.fn();
      const pin = createMockPin(-1); // Already expired
      
      render(<PinDisplay pin={pin} onRefresh={onRefresh} />);
      
      const button = screen.getByRole('button', { name: /refresh pin/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle PIN with different lengths gracefully', () => {
      const pin = { ...createMockPin(), code: 'AB' };
      render(<PinDisplay pin={pin} />);
      
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should handle PIN that is already expired', () => {
      const pin = createMockPin(-10); // Already expired
      render(<PinDisplay pin={pin} />);
      
      expect(screen.getByText('PIN Expired')).toBeInTheDocument();
    });

    it('should handle missing expiresAt gracefully', () => {
      const pin = { id: 123, code: 'ABCD', expiresAt: '' };
      render(<PinDisplay pin={pin} />);
      
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.queryByText(/expires in:/i)).not.toBeInTheDocument();
    });

    it('should not display negative time remaining', () => {
      const pin = createMockPin(-5); // Expired 5 seconds ago
      render(<PinDisplay pin={pin} />);
      
      // Should show "PIN Expired" instead of negative time
      expect(screen.getByText('PIN Expired')).toBeInTheDocument();
      expect(screen.queryByText(/-/)).not.toBeInTheDocument();
    });
  });
});
