import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsList, Tab, TabPanel } from './Tabs';

describe('Tabs', () => {
  const renderTabs = (props = {}) => {
    return render(
      <Tabs defaultValue="tab1" {...props}>
        <TabsList aria-label="Test tabs">
          <Tab value="tab1">Tab 1</Tab>
          <Tab value="tab2">Tab 2</Tab>
          <Tab value="tab3">Tab 3</Tab>
        </TabsList>
        <TabPanel value="tab1">Content 1</TabPanel>
        <TabPanel value="tab2">Content 2</TabPanel>
        <TabPanel value="tab3">Content 3</TabPanel>
      </Tabs>
    );
  };

  describe('Basic Rendering', () => {
    it('renders all tabs', () => {
      renderTabs();
      expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 2' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Tab 3' })).toBeInTheDocument();
    });

    it('renders the default active tab content', () => {
      renderTabs();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('marks the default tab as selected', () => {
      renderTabs();
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab1).toHaveAttribute('tabindex', '0');
    });

    it('marks non-active tabs as not selected', () => {
      renderTabs();
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Tab Switching', () => {
    it('switches tabs on click', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(tab2).toHaveAttribute('aria-selected', 'true');
    });

    it('calls onChange when tab changes', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      renderTabs({ onChange });

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      expect(onChange).toHaveBeenCalledWith('tab2');
    });

    it('works in controlled mode', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const { rerender } = render(
        <Tabs value="tab1" onChange={onChange}>
          <TabsList aria-label="Test tabs">
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
          </TabsList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      expect(onChange).toHaveBeenCalledWith('tab2');

      // Simulate parent component updating the value
      rerender(
        <Tabs value="tab2" onChange={onChange}>
          <TabsList aria-label="Test tabs">
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
          </TabsList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates to next tab with ArrowRight', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await user.keyboard('{ArrowRight}');

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toHaveFocus();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('navigates to previous tab with ArrowLeft', async () => {
      const user = userEvent.setup();
      renderTabs({ defaultValue: 'tab2' });

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      tab2.focus();

      await user.keyboard('{ArrowLeft}');

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveFocus();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('wraps to last tab when pressing ArrowLeft on first tab', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await user.keyboard('{ArrowLeft}');

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      expect(tab3).toHaveFocus();
      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });

    it('wraps to first tab when pressing ArrowRight on last tab', async () => {
      const user = userEvent.setup();
      renderTabs({ defaultValue: 'tab3' });

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      tab3.focus();

      await user.keyboard('{ArrowRight}');

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveFocus();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('navigates to first tab with Home key', async () => {
      const user = userEvent.setup();
      renderTabs({ defaultValue: 'tab3' });

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      tab3.focus();

      await user.keyboard('{Home}');

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveFocus();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('navigates to last tab with End key', async () => {
      const user = userEvent.setup();
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await user.keyboard('{End}');

      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      expect(tab3).toHaveFocus();
      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });
  });

  describe('Vertical Orientation', () => {
    it('navigates with ArrowUp and ArrowDown in vertical mode', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1" orientation="vertical">
          <TabsList aria-label="Test tabs">
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
          </TabsList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await user.keyboard('{ArrowDown}');

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toHaveFocus();
      expect(screen.getByText('Content 2')).toBeInTheDocument();

      await user.keyboard('{ArrowUp}');

      expect(tab1).toHaveFocus();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });

    it('does not respond to ArrowLeft/Right in vertical mode', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1" orientation="vertical">
          <TabsList aria-label="Test tabs">
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
          </TabsList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await user.keyboard('{ArrowRight}');

      // Should still be on tab1
      expect(tab1).toHaveFocus();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('does not activate disabled tabs', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList aria-label="Test tabs">
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2" disabled>
              Tab 2
            </Tab>
          </TabsList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      await user.click(tab2);

      // Should still show content 1
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });

    it('skips disabled tabs in keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <TabsList aria-label="Test tabs">
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2" disabled>
              Tab 2
            </Tab>
            <Tab value="tab3">Tab 3</Tab>
          </TabsList>
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
          <TabPanel value="tab3">Content 3</TabPanel>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      tab1.focus();

      await user.keyboard('{ArrowRight}');

      // Should skip tab2 and go to tab3
      const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
      expect(tab3).toHaveFocus();
      expect(screen.getByText('Content 3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderTabs();

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label', 'Test tabs');
      expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const panel1 = screen.getByRole('tabpanel');

      expect(tab1).toHaveAttribute('aria-controls', panel1.id);
      expect(panel1).toHaveAttribute('aria-labelledby', tab1.id);
    });

    it('sets correct tabindex values', () => {
      renderTabs();

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });

      expect(tab1).toHaveAttribute('tabindex', '0');
      expect(tab2).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Custom Styling', () => {
    it('applies custom className to Tabs', () => {
      const { container } = renderTabs({ className: 'custom-tabs' });
      expect(container.querySelector('.custom-tabs')).toBeInTheDocument();
    });

    it('applies custom className to TabsList', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList className="custom-list" aria-label="Test">
            <Tab value="tab1">Tab 1</Tab>
          </TabsList>
          <TabPanel value="tab1">Content</TabPanel>
        </Tabs>
      );

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveClass('custom-list');
    });

    it('applies custom className to Tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList aria-label="Test">
            <Tab value="tab1" className="custom-tab">
              Tab 1
            </Tab>
          </TabsList>
          <TabPanel value="tab1">Content</TabPanel>
        </Tabs>
      );

      const tab = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab).toHaveClass('custom-tab');
    });

    it('applies custom className to TabPanel', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList aria-label="Test">
            <Tab value="tab1">Tab 1</Tab>
          </TabsList>
          <TabPanel value="tab1" className="custom-panel">
            Content
          </TabPanel>
        </Tabs>
      );

      const panel = screen.getByRole('tabpanel');
      expect(panel).toHaveClass('custom-panel');
    });
  });
});
