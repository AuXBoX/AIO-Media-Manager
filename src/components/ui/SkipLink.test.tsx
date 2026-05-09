import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkipLink, SkipLinks } from './SkipLink';

describe('SkipLink', () => {
  let targetElement: HTMLElement;

  beforeEach(() => {
    targetElement = document.createElement('div');
    targetElement.id = 'main-content';
    document.body.appendChild(targetElement);
  });

  afterEach(() => {
    document.body.removeChild(targetElement);
  });

  it('should render skip link', () => {
    render(<SkipLink targetId="main-content" />);
    
    const link = screen.getByText('Skip to main content');
    expect(link).toBeInTheDocument();
  });

  it('should render custom text', () => {
    render(<SkipLink targetId="main-content">Custom skip text</SkipLink>);
    
    const link = screen.getByText('Custom skip text');
    expect(link).toBeInTheDocument();
  });

  it('should have correct href', () => {
    render(<SkipLink targetId="main-content" />);
    
    const link = screen.getByText('Skip to main content');
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('should call focus on target element on click', async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="main-content" />);
    
    const focusSpy = vi.spyOn(targetElement, 'focus');
    
    const link = screen.getByText('Skip to main content');
    await user.click(link);
    
    expect(focusSpy).toHaveBeenCalled();
  });

  it('should have sr-only class for accessibility', () => {
    render(<SkipLink targetId="main-content" />);
    
    const link = screen.getByText('Skip to main content');
    expect(link).toHaveClass('sr-only');
  });
});

describe('SkipLinks', () => {
  beforeEach(() => {
    const main = document.createElement('div');
    main.id = 'main-content';
    document.body.appendChild(main);

    const nav = document.createElement('nav');
    nav.id = 'navigation';
    document.body.appendChild(nav);
  });

  afterEach(() => {
    const main = document.getElementById('main-content');
    const nav = document.getElementById('navigation');
    if (main) document.body.removeChild(main);
    if (nav) document.body.removeChild(nav);
  });

  it('should render multiple skip links', () => {
    const links = [
      { targetId: 'main-content', label: 'Skip to main content' },
      { targetId: 'navigation', label: 'Skip to navigation' },
    ];

    render(<SkipLinks links={links} />);
    
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    expect(screen.getByText('Skip to navigation')).toBeInTheDocument();
  });

  it('should have navigation landmark', () => {
    const links = [
      { targetId: 'main-content', label: 'Skip to main content' },
    ];

    render(<SkipLinks links={links} />);
    
    const nav = screen.getByLabelText('Skip navigation');
    expect(nav).toBeInTheDocument();
  });
});
