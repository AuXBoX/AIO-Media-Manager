import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TableLoadingState } from './TableLoadingState';

describe('TableLoadingState', () => {
  it('renders with default props', () => {
    const { container } = render(<TableLoadingState />);
    expect(container.querySelector('.bg-background-primary')).toBeInTheDocument();
  });

  it('renders header when showHeader is true', () => {
    const { container } = render(<TableLoadingState showHeader />);
    const header = container.querySelector('.sticky');
    expect(header).toBeInTheDocument();
  });

  it('hides header when showHeader is false', () => {
    const { container } = render(<TableLoadingState showHeader={false} />);
    const header = container.querySelector('.sticky');
    expect(header).not.toBeInTheDocument();
  });

  it('renders specified number of rows', () => {
    const { container } = render(<TableLoadingState rows={5} showHeader={false} />);
    const rows = container.querySelectorAll('.border-b');
    expect(rows).toHaveLength(5);
  });

  it('shows poster column when showPoster is true', () => {
    const { container } = render(<TableLoadingState showPoster />);
    const posterSkeletons = container.querySelectorAll('.flex-shrink-0 .bg-slate-200');
    expect(posterSkeletons.length).toBeGreaterThan(0);
  });

  it('applies row height mode', () => {
    const { container: comfortableContainer } = render(
      <TableLoadingState rowHeight="comfortable" rows={1} />
    );
    const comfortableRows = comfortableContainer.querySelectorAll('[style*="height"]');
    const comfortableRow = Array.from(comfortableRows).find(
      (el) => (el as HTMLElement).style.height === '56px'
    );
    expect(comfortableRow).toBeTruthy();

    const { container: compactContainer } = render(
      <TableLoadingState rowHeight="compact" rows={1} />
    );
    const compactRows = compactContainer.querySelectorAll('[style*="height"]');
    const compactRow = Array.from(compactRows).find(
      (el) => (el as HTMLElement).style.height === '48px'
    );
    expect(compactRow).toBeTruthy();
  });

  it('renders column header skeletons', () => {
    const { container } = render(<TableLoadingState columns={4} />);
    const headerSkeletons = container.querySelectorAll('.sticky .bg-slate-200');
    expect(headerSkeletons).toHaveLength(4);
  });

  it('accepts custom className', () => {
    const { container } = render(<TableLoadingState className="custom-class" />);
    const skeletonTable = container.querySelector('.custom-class');
    expect(skeletonTable).toBeInTheDocument();
  });
});
