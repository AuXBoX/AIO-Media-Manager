import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonGrid,
} from './Skeleton';

describe('Skeleton', () => {
  describe('Basic Skeleton', () => {
    it('renders with default props', () => {
      const { container } = render(<Skeleton />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('bg-slate-200', 'rounded-lg', 'animate-pulse');
    });

    it('applies custom width and height', () => {
      const { container } = render(<Skeleton width="200px" height="100px" />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '200px', height: '100px' });
    });

    it('applies numeric width and height', () => {
      const { container } = render(<Skeleton width={200} height={100} />);
      const skeleton = container.firstChild as HTMLElement;
      expect(skeleton).toHaveStyle({ width: '200px', height: '100px' });
    });

    it('applies border radius variants', () => {
      const { container: noneContainer } = render(<Skeleton radius="none" />);
      expect(noneContainer.firstChild).toHaveClass('rounded-none');

      const { container: smContainer } = render(<Skeleton radius="sm" />);
      expect(smContainer.firstChild).toHaveClass('rounded');

      const { container: mdContainer } = render(<Skeleton radius="md" />);
      expect(mdContainer.firstChild).toHaveClass('rounded-lg');

      const { container: lgContainer } = render(<Skeleton radius="lg" />);
      expect(lgContainer.firstChild).toHaveClass('rounded-xl');

      const { container: fullContainer } = render(<Skeleton radius="full" />);
      expect(fullContainer.firstChild).toHaveClass('rounded-full');
    });

    it('applies animation variants', () => {
      const { container: pulseContainer } = render(<Skeleton animation="pulse" />);
      expect(pulseContainer.firstChild).toHaveClass('animate-pulse');

      const { container: waveContainer } = render(<Skeleton animation="wave" />);
      expect(waveContainer.firstChild).toHaveClass('animate-shimmer');

      const { container: noneContainer } = render(<Skeleton animation="none" />);
      expect(noneContainer.firstChild).not.toHaveClass('animate-pulse', 'animate-shimmer');
    });

    it('accepts custom className', () => {
      const { container } = render(<Skeleton className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('has aria-hidden attribute', () => {
      const { container } = render(<Skeleton />);
      expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('SkeletonText', () => {
    it('renders single line by default', () => {
      const { container } = render(<SkeletonText />);
      const skeletons = container.querySelectorAll('.bg-slate-200');
      expect(skeletons).toHaveLength(1);
    });

    it('renders multiple lines', () => {
      const { container } = render(<SkeletonText lines={3} />);
      const skeletons = container.querySelectorAll('.bg-slate-200');
      expect(skeletons).toHaveLength(3);
    });

    it('applies spacing variants', () => {
      const { container: smContainer } = render(<SkeletonText spacing="sm" />);
      expect(smContainer.firstChild).toHaveClass('space-y-2');

      const { container: mdContainer } = render(<SkeletonText spacing="md" />);
      expect(mdContainer.firstChild).toHaveClass('space-y-3');

      const { container: lgContainer } = render(<SkeletonText spacing="lg" />);
      expect(lgContainer.firstChild).toHaveClass('space-y-4');
    });

    it('applies custom last line width', () => {
      const { container } = render(<SkeletonText lines={2} lastLineWidth={60} />);
      const skeletons = container.querySelectorAll('.bg-slate-200');
      const lastSkeleton = skeletons[skeletons.length - 1] as HTMLElement;
      expect(lastSkeleton).toHaveStyle({ width: '60%' });
    });
  });

  describe('SkeletonCard', () => {
    it('renders card with default props', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('.bg-slate-200');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders card with custom dimensions', () => {
      const { container } = render(<SkeletonCard width={200} height={300} />);
      const card = container.querySelector('.bg-slate-200') as HTMLElement;
      expect(card).toHaveStyle({ width: '200px', height: '300px' });
    });

    it('shows title when showTitle is true', () => {
      const { container } = render(<SkeletonCard showTitle />);
      const skeletons = container.querySelectorAll('.bg-slate-200');
      expect(skeletons.length).toBeGreaterThan(1);
    });

    it('hides title when showTitle is false', () => {
      const { container } = render(<SkeletonCard showTitle={false} />);
      const skeletons = container.querySelectorAll('.bg-slate-200');
      expect(skeletons).toHaveLength(1);
    });

    it('shows subtitle when showSubtitle is true', () => {
      const { container } = render(<SkeletonCard showTitle showSubtitle />);
      const skeletons = container.querySelectorAll('.bg-slate-200');
      expect(skeletons.length).toBeGreaterThan(2);
    });
  });

  describe('SkeletonTable', () => {
    it('renders table with default props', () => {
      const { container } = render(<SkeletonTable />);
      const rows = container.querySelectorAll('.border-b');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('renders specified number of rows', () => {
      const { container } = render(<SkeletonTable rows={3} />);
      const rows = container.querySelectorAll('.border-b');
      expect(rows).toHaveLength(3);
    });

    it('shows poster column when showPoster is true', () => {
      const { container } = render(<SkeletonTable showPoster />);
      const posterSkeletons = container.querySelectorAll('.flex-shrink-0 .bg-slate-200');
      expect(posterSkeletons.length).toBeGreaterThan(0);
    });

    it('applies row height mode', () => {
      const { container: comfortableContainer } = render(
        <SkeletonTable rowHeight="comfortable" />
      );
      const comfortableRow = comfortableContainer.querySelector('.border-b') as HTMLElement;
      expect(comfortableRow).toHaveStyle({ height: '56px' });

      const { container: compactContainer } = render(<SkeletonTable rowHeight="compact" />);
      const compactRow = compactContainer.querySelector('.border-b') as HTMLElement;
      expect(compactRow).toHaveStyle({ height: '48px' });
    });
  });

  describe('SkeletonGrid', () => {
    it('renders grid with default props', () => {
      const { container } = render(<SkeletonGrid />);
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveClass('grid');
    });

    it('renders specified number of items', () => {
      const { container } = render(<SkeletonGrid items={6} />);
      const cards = container.querySelectorAll('.flex.flex-col');
      expect(cards).toHaveLength(6);
    });

    it('applies grid columns', () => {
      const { container } = render(<SkeletonGrid columns={3} />);
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(3, 1fr)' });
    });

    it('applies gap', () => {
      const { container } = render(<SkeletonGrid gap={16} />);
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveStyle({ gap: '16px' });
    });

    it('passes card dimensions to SkeletonCard', () => {
      const { container } = render(<SkeletonGrid cardWidth={200} cardHeight={300} />);
      const card = container.querySelector('.bg-slate-200') as HTMLElement;
      expect(card).toHaveStyle({ width: '200px', height: '300px' });
    });
  });
});
