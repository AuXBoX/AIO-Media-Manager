import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsiveLayout, ResponsiveHeader, ResponsiveContent } from './ResponsiveLayout';

// Mock hooks
vi.mock('@/hooks/useBreakpoint', () => ({
  useBreakpoint: vi.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    currentBreakpoint: 'lg',
    isTouchDevice: false,
    isAtLeast: () => true,
    isAtMost: () => false,
  })),
}));

vi.mock('@/components/ui/MobileNav', () => ({
  MobileNav: ({ children }: { children: React.ReactNode }) => <div data-testid="mobile-nav">{children}</div>,
  useMobileNav: () => ({
    isOpen: false,
    toggle: vi.fn(),
    open: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('@/components/ui/ResponsiveSidebar', () => ({
  ResponsiveSidebar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="desktop-sidebar">{children}</div>
  ),
}));

describe('ResponsiveLayout', () => {
  it('should render sidebar and main content', () => {
    render(
      <ResponsiveLayout
        sidebar={<div>Sidebar content</div>}
      >
        <div>Main content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByText('Sidebar content')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
  });

  it('should render header when provided', () => {
    render(
      <ResponsiveLayout
        sidebar={<div>Sidebar</div>}
        header={<div>Header content</div>}
      >
        <div>Main content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('should render footer when provided', () => {
    render(
      <ResponsiveLayout
        sidebar={<div>Sidebar</div>}
        footer={<div>Footer content</div>}
      >
        <div>Main content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should render desktop sidebar on desktop', () => {
    render(
      <ResponsiveLayout
        sidebar={<div>Sidebar content</div>}
      >
        <div>Main content</div>
      </ResponsiveLayout>
    );

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
  });
});

describe('ResponsiveHeader', () => {
  it('should render title', () => {
    render(<ResponsiveHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render actions when provided', () => {
    render(
      <ResponsiveHeader
        title="Test Title"
        actions={<button>Action</button>}
      />
    );
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('should render breadcrumbs when provided', () => {
    render(
      <ResponsiveHeader
        title="Test Title"
        breadcrumbs={<div>Home / Library</div>}
      />
    );
    expect(screen.getByText('Home / Library')).toBeInTheDocument();
  });
});

describe('ResponsiveContent', () => {
  it('should render children', () => {
    render(
      <ResponsiveContent>
        <div>Content</div>
      </ResponsiveContent>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ResponsiveContent className="custom-class">
        <div>Content</div>
      </ResponsiveContent>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
