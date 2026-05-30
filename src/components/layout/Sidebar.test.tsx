import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarNav, 
  SidebarSection, 
  SidebarItem, 
  SidebarFooter,
  SidebarUser,
  SidebarDivider
} from './Sidebar';

describe('Sidebar Components', () => {
  it('renders Sidebar with children', () => {
    render(
      <Sidebar>
        <div>Test Content</div>
      </Sidebar>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders SidebarHeader', () => {
    render(
      <SidebarHeader>
        <div>Header Content</div>
      </SidebarHeader>
    );
    expect(screen.getByText('Header Content')).toBeInTheDocument();
  });

  it('renders SidebarNav', () => {
    render(
      <SidebarNav>
        <div>Nav Content</div>
      </SidebarNav>
    );
    expect(screen.getByText('Nav Content')).toBeInTheDocument();
  });

  it('renders SidebarSection with title', () => {
    render(
      <SidebarSection title="Test Section">
        <div>Section Content</div>
      </SidebarSection>
    );
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Section Content')).toBeInTheDocument();
  });

  it('renders SidebarSection without title when collapsed', () => {
    render(
      <SidebarSection title="Test Section" isCollapsed>
        <div>Section Content</div>
      </SidebarSection>
    );
    expect(screen.queryByText('Test Section')).not.toBeInTheDocument();
    expect(screen.getByText('Section Content')).toBeInTheDocument();
  });

  it('renders SidebarItem with icon and label', () => {
    const icon = <svg data-testid="test-icon" />;
    render(
      <SidebarItem icon={icon} label="Test Item" />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('renders SidebarItem with active state', () => {
    const icon = <svg data-testid="test-icon" />;
    const { container } = render(
      <SidebarItem icon={icon} label="Test Item" isActive />
    );
    const button = container.querySelector('button');
    expect(button).toHaveClass('sidebar-nav-item-active');
  });

  it('renders SidebarItem collapsed (icon only)', () => {
    const icon = <svg data-testid="test-icon" />;
    render(
      <SidebarItem icon={icon} label="Test Item" isCollapsed />
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.queryByText('Test Item')).not.toBeInTheDocument();
  });

  it('renders SidebarFooter', () => {
    render(
      <SidebarFooter>
        <div>Footer Content</div>
      </SidebarFooter>
    );
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('renders SidebarUser with username', () => {
    render(
      <SidebarUser username="TestUser" email="test@example.com" />
    );
    expect(screen.getByText('TestUser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders SidebarUser collapsed', () => {
    render(
      <SidebarUser username="TestUser" email="test@example.com" isCollapsed />
    );
    expect(screen.queryByText('TestUser')).not.toBeInTheDocument();
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument();
  });

  it('renders SidebarDivider', () => {
    const { container } = render(<SidebarDivider />);
    const divider = container.firstChild;
    expect(divider).toBeInTheDocument();
  });
});
