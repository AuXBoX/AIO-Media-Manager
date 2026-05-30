import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardContent, CardFooter } from './Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('renders with all sections', () => {
      render(
        <Card>
          <CardHeader>Header</CardHeader>
          <CardContent>Content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );
      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('renders without header or footer', () => {
      render(
        <Card>
          <CardContent>Just content</CardContent>
        </Card>
      );
      expect(screen.getByText('Just content')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has correct base styles', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass(
        'bg-white',
        'border',
        'border-slate-200/50',
        'rounded-xl',
        'transition-all',
        'duration-200'
      );
    });

    it('has hover styles by default', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]');
    });

    it('removes hover styles when hoverable is false', () => {
      const { container } = render(<Card hoverable={false}>Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]');
    });

    it('accepts custom className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class', 'bg-white', 'rounded-xl');
    });
  });

  describe('HTML attributes', () => {
    it('forwards HTML div attributes', () => {
      const { container } = render(
        <Card data-testid="test-card" id="card-1">
          Content
        </Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('data-testid', 'test-card');
      expect(card).toHaveAttribute('id', 'card-1');
    });

    it('supports aria attributes', () => {
      const { container } = render(
        <Card aria-label="Information card">Content</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('aria-label', 'Information card');
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<Card ref={ref}>Content</Card>);
      expect(ref).toHaveBeenCalled();
    });
  });
});

describe('CardHeader', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<CardHeader>Header content</CardHeader>);
      expect(screen.getByText('Header content')).toBeInTheDocument();
    });

    it('renders multiple children with flex layout', () => {
      render(
        <CardHeader>
          <h3>Title</h3>
          <button>Action</button>
        </CardHeader>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has correct base styles', () => {
      const { container } = render(<CardHeader>Header</CardHeader>);
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass(
        'flex',
        'items-center',
        'justify-between',
        'p-4',
        'border-b',
        'border-slate-200/50'
      );
    });

    it('accepts custom className', () => {
      const { container } = render(
        <CardHeader className="custom-header">Header</CardHeader>
      );
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass('custom-header', 'flex', 'items-center');
    });
  });

  describe('HTML attributes', () => {
    it('forwards HTML div attributes', () => {
      const { container } = render(
        <CardHeader data-testid="test-header">Header</CardHeader>
      );
      const header = container.firstChild as HTMLElement;
      expect(header).toHaveAttribute('data-testid', 'test-header');
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<CardHeader ref={ref}>Header</CardHeader>);
      expect(ref).toHaveBeenCalled();
    });
  });
});

describe('CardContent', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<CardContent>Content area</CardContent>);
      expect(screen.getByText('Content area')).toBeInTheDocument();
    });

    it('renders complex content', () => {
      render(
        <CardContent>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </CardContent>
      );
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has correct base styles', () => {
      const { container } = render(<CardContent>Content</CardContent>);
      const content = container.firstChild as HTMLElement;
      expect(content).toHaveClass('p-4');
    });

    it('accepts custom className', () => {
      const { container } = render(
        <CardContent className="custom-content">Content</CardContent>
      );
      const content = container.firstChild as HTMLElement;
      expect(content).toHaveClass('custom-content', 'p-4');
    });
  });

  describe('HTML attributes', () => {
    it('forwards HTML div attributes', () => {
      const { container } = render(
        <CardContent data-testid="test-content">Content</CardContent>
      );
      const content = container.firstChild as HTMLElement;
      expect(content).toHaveAttribute('data-testid', 'test-content');
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<CardContent ref={ref}>Content</CardContent>);
      expect(ref).toHaveBeenCalled();
    });
  });
});

describe('CardFooter', () => {
  describe('Rendering', () => {
    it('renders with children', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('renders multiple action buttons', () => {
      render(
        <CardFooter>
          <button>Cancel</button>
          <button>Save</button>
        </CardFooter>
      );
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has correct base styles', () => {
      const { container } = render(<CardFooter>Footer</CardFooter>);
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveClass(
        'flex',
        'items-center',
        'justify-end',
        'gap-2',
        'p-4',
        'border-t',
        'border-slate-200/50'
      );
    });

    it('accepts custom className', () => {
      const { container } = render(
        <CardFooter className="custom-footer">Footer</CardFooter>
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveClass('custom-footer', 'flex', 'items-center');
    });
  });

  describe('HTML attributes', () => {
    it('forwards HTML div attributes', () => {
      const { container } = render(
        <CardFooter data-testid="test-footer">Footer</CardFooter>
      );
      const footer = container.firstChild as HTMLElement;
      expect(footer).toHaveAttribute('data-testid', 'test-footer');
    });
  });

  describe('Ref forwarding', () => {
    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<CardFooter ref={ref}>Footer</CardFooter>);
      expect(ref).toHaveBeenCalled();
    });
  });
});

describe('Card Integration', () => {
  it('renders complete card with all sections', () => {
    render(
      <Card data-testid="full-card">
        <CardHeader>
          <h3>Card Title</h3>
          <button>Edit</button>
        </CardHeader>
        <CardContent>
          <p>This is the main content area.</p>
        </CardContent>
        <CardFooter>
          <button>Cancel</button>
          <button>Save</button>
        </CardFooter>
      </Card>
    );

    const card = screen.getByTestId('full-card');
    expect(card).toBeInTheDocument();
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('This is the main content area.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders card with only content section', () => {
    render(
      <Card>
        <CardContent>Simple card content</CardContent>
      </Card>
    );
    expect(screen.getByText('Simple card content')).toBeInTheDocument();
  });

  it('renders card with header and content only', () => {
    render(
      <Card>
        <CardHeader>Header Only</CardHeader>
        <CardContent>Content Only</CardContent>
      </Card>
    );
    expect(screen.getByText('Header Only')).toBeInTheDocument();
    expect(screen.getByText('Content Only')).toBeInTheDocument();
  });
});
