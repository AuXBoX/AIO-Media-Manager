import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GridLoadingState, GridLoadingStateResponsive } from './GridLoadingState';

describe('GridLoadingState', () => {
  it('renders with default props', () => {
    const { container } = render(<GridLoadingState />);
    const grid = container.querySelector('[style*="grid"]');
    expect(grid).toBeInTheDocument();
  });

  it('renders specified number of items', () => {
    const { container } = render(<GridLoadingState items={6} />);
    const cards = container.querySelectorAll('.flex.flex-col');
    expect(cards).toHaveLength(6);
  });

  it('applies grid columns', () => {
    const { container } = render(<GridLoadingState columns={3} cardWidth={200} />);
    const grid = container.querySelector('[style*="grid"]') as HTMLElement;
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(3, 200px)' });
  });

  it('applies gap', () => {
    const { container } = render(<GridLoadingState gap={16} />);
    const grid = container.querySelector('[style*="grid"]') as HTMLElement;
    expect(grid).toHaveStyle({ gap: '16px' });
  });

  it('passes card dimensions to skeleton cards', () => {
    const { container } = render(<GridLoadingState cardWidth={200} cardHeight={300} />);
    const card = container.querySelector('.bg-slate-200') as HTMLElement;
    expect(card).toHaveStyle({ width: '200px', height: '300px' });
  });

  it('shows titles when showTitle is true', () => {
    const { container } = render(<GridLoadingState items={2} showTitle />);
    const skeletons = container.querySelectorAll('.bg-slate-200');
    // Each card has poster + title = 2 skeletons per card
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('shows subtitles when showSubtitle is true', () => {
    const { container } = render(
      <GridLoadingState items={2} showTitle showSubtitle />
    );
    const skeletons = container.querySelectorAll('.bg-slate-200');
    // Each card has poster + title + subtitle = 3 skeletons per card
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });

  it('accepts custom className', () => {
    const { container } = render(<GridLoadingState className="custom-class" />);
    const grid = container.querySelector('.custom-class');
    expect(grid).toBeInTheDocument();
  });
});

describe('GridLoadingStateResponsive', () => {
  it('renders with default props', () => {
    const { container } = render(<GridLoadingStateResponsive />);
    const grid = container.querySelector('[style*="grid"]');
    expect(grid).toBeInTheDocument();
  });

  it('renders specified number of items', () => {
    const { container } = render(<GridLoadingStateResponsive items={8} />);
    const cards = container.querySelectorAll('.flex.flex-col');
    expect(cards).toHaveLength(8);
  });

  it('applies gap', () => {
    const { container } = render(<GridLoadingStateResponsive gap={20} />);
    const grid = container.querySelector('[style*="grid"]') as HTMLElement;
    expect(grid).toHaveStyle({ gap: '20px' });
  });

  it('passes card dimensions to skeleton cards', () => {
    const { container } = render(
      <GridLoadingStateResponsive cardWidth={180} cardHeight={270} />
    );
    const card = container.querySelector('.bg-slate-200') as HTMLElement;
    expect(card).toHaveStyle({ width: '180px', height: '270px' });
  });

  it('accepts custom className', () => {
    const { container } = render(<GridLoadingStateResponsive className="custom-class" />);
    const grid = container.querySelector('.custom-class');
    expect(grid).toBeInTheDocument();
  });
});
