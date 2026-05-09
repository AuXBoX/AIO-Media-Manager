import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CachedDataBadge } from './CachedDataBadge';

describe('CachedDataBadge', () => {
  describe('Visibility', () => {
    it('should not render when isCached is false', () => {
      const { container } = render(<CachedDataBadge isCached={false} />);
      
      expect(container.firstChild).toBeNull();
    });

    it('should render when isCached is true', () => {
      render(<CachedDataBadge isCached={true} />);
      
      expect(screen.getByText('Cached')).toBeInTheDocument();
    });
  });

  describe('Dirty State', () => {
    it('should display "Cached" when not dirty', () => {
      render(<CachedDataBadge isCached={true} isDirty={false} />);
      
      expect(screen.getByText('Cached')).toBeInTheDocument();
    });

    it('should display "Modified" when dirty', () => {
      render(<CachedDataBadge isCached={true} isDirty={true} />);
      
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });

    it('should use yellow styling when dirty', () => {
      const { container } = render(<CachedDataBadge isCached={true} isDirty={true} />);
      
      const badge = container.querySelector('.bg-yellow-100');
      expect(badge).toBeInTheDocument();
    });

    it('should use gray styling when not dirty', () => {
      const { container } = render(<CachedDataBadge isCached={true} isDirty={false} />);
      
      const badge = container.querySelector('.bg-gray-100');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      const { container } = render(<CachedDataBadge isCached={true} size="sm" />);
      
      const badge = container.querySelector('.text-xs');
      expect(badge).toBeInTheDocument();
    });

    it('should apply medium size classes', () => {
      const { container } = render(<CachedDataBadge isCached={true} size="md" />);
      
      const badge = container.querySelector('.text-sm');
      expect(badge).toBeInTheDocument();
    });

    it('should apply large size classes', () => {
      const { container } = render(<CachedDataBadge isCached={true} size="lg" />);
      
      const badge = container.querySelector('.text-base');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Position Variants', () => {
    it('should apply inline position by default', () => {
      const { container } = render(<CachedDataBadge isCached={true} />);
      
      const badge = container.querySelector('.absolute');
      expect(badge).not.toBeInTheDocument();
    });

    it('should apply top-left position', () => {
      const { container } = render(<CachedDataBadge isCached={true} position="top-left" />);
      
      const badge = container.querySelector('.absolute.top-2.left-2');
      expect(badge).toBeInTheDocument();
    });

    it('should apply top-right position', () => {
      const { container } = render(<CachedDataBadge isCached={true} position="top-right" />);
      
      const badge = container.querySelector('.absolute.top-2.right-2');
      expect(badge).toBeInTheDocument();
    });

    it('should apply bottom-left position', () => {
      const { container } = render(<CachedDataBadge isCached={true} position="bottom-left" />);
      
      const badge = container.querySelector('.absolute.bottom-2.left-2');
      expect(badge).toBeInTheDocument();
    });

    it('should apply bottom-right position', () => {
      const { container } = render(<CachedDataBadge isCached={true} position="bottom-right" />);
      
      const badge = container.querySelector('.absolute.bottom-2.right-2');
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should display cloud download icon when not dirty', () => {
      const { container } = render(<CachedDataBadge isCached={true} isDirty={false} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // Cloud download icon has specific path
      const path = svg?.querySelector('path[d*="M7 16"]');
      expect(path).toBeInTheDocument();
    });

    it('should display pencil icon when dirty', () => {
      const { container } = render(<CachedDataBadge isCached={true} isDirty={true} />);
      
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      
      // Pencil icon has specific path
      const path = svg?.querySelector('path[d*="M15.232"]');
      expect(path).toBeInTheDocument();
    });
  });

  describe('Tooltips', () => {
    it('should have tooltip for cached data', () => {
      const { container } = render(<CachedDataBadge isCached={true} isDirty={false} />);
      
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveAttribute('title', 'Cached data');
    });

    it('should have tooltip for dirty data', () => {
      const { container } = render(<CachedDataBadge isCached={true} isDirty={true} />);
      
      const badge = container.firstChild as HTMLElement;
      expect(badge).toHaveAttribute('title', 'Cached with offline changes');
    });
  });

  describe('Edge Cases', () => {
    it('should handle all props together', () => {
      render(
        <CachedDataBadge
          isCached={true}
          isDirty={true}
          size="lg"
          position="top-right"
        />
      );
      
      expect(screen.getByText('Modified')).toBeInTheDocument();
    });

    it('should default to small size and inline position', () => {
      const { container } = render(<CachedDataBadge isCached={true} />);
      
      const badge = container.querySelector('.text-xs');
      expect(badge).toBeInTheDocument();
      
      const absolute = container.querySelector('.absolute');
      expect(absolute).not.toBeInTheDocument();
    });
  });
});
