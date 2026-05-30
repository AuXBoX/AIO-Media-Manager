import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarVisualTest } from './SidebarVisualTest';

describe('SidebarVisualTest', () => {
  it('renders the visual test component', () => {
    render(<SidebarVisualTest />);
    expect(screen.getByText('Sidebar Blue Active State Pill - Visual Test')).toBeInTheDocument();
  });

  it('shows active state on Movies by default', () => {
    const { container } = render(<SidebarVisualTest />);
    const activeButtons = container.querySelectorAll('.sidebar-nav-item-active');
    expect(activeButtons.length).toBe(1);
    expect(activeButtons[0]).toHaveTextContent('Movies');
  });

  it('changes active state when clicking different items', () => {
    const { container } = render(<SidebarVisualTest />);
    
    // Click on TV Shows
    const tvButton = screen.getByText('TV Shows');
    fireEvent.click(tvButton);
    
    // Check that TV Shows is now active
    const activeButtons = container.querySelectorAll('.sidebar-nav-item-active');
    expect(activeButtons.length).toBe(1);
    expect(activeButtons[0]).toHaveTextContent('TV Shows');
  });

  it('applies correct CSS classes for active state', () => {
    const { container } = render(<SidebarVisualTest />);
    const activeButton = container.querySelector('.sidebar-nav-item-active');
    
    expect(activeButton).toHaveClass('sidebar-nav-item');
    expect(activeButton).toHaveClass('sidebar-nav-item-active');
  });

  it('shows all navigation items', () => {
    render(<SidebarVisualTest />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Movies')).toBeInTheDocument();
    expect(screen.getByText('TV Shows')).toBeInTheDocument();
    expect(screen.getByText('Music')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('displays implementation status information', () => {
    render(<SidebarVisualTest />);
    
    expect(screen.getByText('✅ Implementation Complete')).toBeInTheDocument();
    expect(screen.getByText(/Active State \(yellow pill\)/)).toBeInTheDocument();
    expect(screen.getByText(/Hover State/)).toBeInTheDocument();
    expect(screen.getByText(/Spacing & Layout/)).toBeInTheDocument();
  });

  it('shows user information in footer', () => {
    render(<SidebarVisualTest />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('toggles sidebar collapse state', () => {
    render(<SidebarVisualTest />);
    
    // Find the collapse button
    const collapseButton = screen.getByLabelText(/collapse sidebar/i);
    expect(collapseButton).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(collapseButton);
    
    // Button text should change
    expect(screen.getByLabelText(/expand sidebar/i)).toBeInTheDocument();
  });
});
