/**
 * ThemeToggle Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';
import * as useThemeModule from '@/hooks/useTheme';

describe('ThemeToggle', () => {
  const mockSetTheme = vi.fn();
  const mockToggleTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useTheme hook
    vi.spyOn(useThemeModule, 'useTheme').mockReturnValue({
      themeMode: 'light',
      resolvedTheme: 'light',
      systemTheme: 'light',
      setTheme: mockSetTheme,
      toggleTheme: mockToggleTheme,
      isDark: false,
    });
  });

  describe('Dropdown variant', () => {
    it('should render dropdown with all theme options', () => {
      render(<ThemeToggle variant="dropdown" />);

      const select = screen.getByLabelText('Select theme');
      expect(select).toBeInTheDocument();

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
      expect(options[0]).toHaveTextContent('Light');
      expect(options[1]).toHaveTextContent('Dark');
      expect(options[2]).toHaveTextContent('System');
    });

    it('should show current theme as selected', () => {
      render(<ThemeToggle variant="dropdown" />);

      const select = screen.getByLabelText('Select theme') as HTMLSelectElement;
      expect(select.value).toBe('light');
    });

    it('should call setTheme when option is selected', () => {
      render(<ThemeToggle variant="dropdown" />);

      const select = screen.getByLabelText('Select theme');
      fireEvent.change(select, { target: { value: 'dark' } });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should apply custom className', () => {
      const { container } = render(<ThemeToggle variant="dropdown" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Buttons variant', () => {
    it('should render button group with all theme options', () => {
      render(<ThemeToggle variant="buttons" />);

      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('should highlight current theme button', () => {
      render(<ThemeToggle variant="buttons" />);

      const lightButton = screen.getByRole('button', { name: /Switch to Light theme/i });
      expect(lightButton).toHaveClass('bg-primary-500');
    });

    it('should call setTheme when button is clicked', () => {
      render(<ThemeToggle variant="buttons" />);

      const darkButton = screen.getByRole('button', { name: /Switch to Dark theme/i });
      fireEvent.click(darkButton);

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should hide labels when showLabels is false', () => {
      render(<ThemeToggle variant="buttons" showLabels={false} />);

      // Icons should still be present
      expect(screen.getByText('☀️')).toBeInTheDocument();
      expect(screen.getByText('🌙')).toBeInTheDocument();
      expect(screen.getByText('💻')).toBeInTheDocument();

      // Labels should not be present
      expect(screen.queryByText('Light')).not.toBeInTheDocument();
      expect(screen.queryByText('Dark')).not.toBeInTheDocument();
      expect(screen.queryByText('System')).not.toBeInTheDocument();
    });

    it('should set aria-pressed correctly', () => {
      render(<ThemeToggle variant="buttons" />);

      const lightButton = screen.getByRole('button', { name: /Switch to Light theme/i });
      const darkButton = screen.getByRole('button', { name: /Switch to Dark theme/i });

      expect(lightButton).toHaveAttribute('aria-pressed', 'true');
      expect(darkButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('Icon variant', () => {
    it('should render icon button', () => {
      render(<ThemeToggle variant="icon" />);

      const button = screen.getByRole('button', { name: /Current theme: Light/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('☀️');
    });

    it('should cycle through themes on click', () => {
      render(<ThemeToggle variant="icon" />);

      const button = screen.getByRole('button');

      // Click should cycle from light -> dark
      fireEvent.click(button);
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should show correct icon for dark theme', () => {
      vi.spyOn(useThemeModule, 'useTheme').mockReturnValue({
        themeMode: 'dark',
        resolvedTheme: 'dark',
        systemTheme: 'light',
        setTheme: mockSetTheme,
        toggleTheme: mockToggleTheme,
        isDark: true,
      });

      render(<ThemeToggle variant="icon" />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('🌙');
    });

    it('should show correct icon for system theme', () => {
      vi.spyOn(useThemeModule, 'useTheme').mockReturnValue({
        themeMode: 'system',
        resolvedTheme: 'light',
        systemTheme: 'light',
        setTheme: mockSetTheme,
        toggleTheme: mockToggleTheme,
        isDark: false,
      });

      render(<ThemeToggle variant="icon" />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('💻');
    });

    it('should have accessible title attribute', () => {
      render(<ThemeToggle variant="icon" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Current: Light');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for dropdown', () => {
      render(<ThemeToggle variant="dropdown" />);

      const select = screen.getByLabelText('Select theme');
      expect(select).toBeInTheDocument();
    });

    it('should have proper ARIA labels for buttons', () => {
      render(<ThemeToggle variant="buttons" />);

      expect(screen.getByRole('button', { name: /Switch to Light theme/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Switch to Dark theme/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Switch to System theme/i })).toBeInTheDocument();
    });

    it('should have proper ARIA label for icon button', () => {
      render(<ThemeToggle variant="icon" />);

      const button = screen.getByRole('button', { name: /Current theme: Light/i });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Theme cycling logic', () => {
    it('should cycle from light to dark', () => {
      vi.spyOn(useThemeModule, 'useTheme').mockReturnValue({
        themeMode: 'light',
        resolvedTheme: 'light',
        systemTheme: 'light',
        setTheme: mockSetTheme,
        toggleTheme: mockToggleTheme,
        isDark: false,
      });

      render(<ThemeToggle variant="icon" />);
      fireEvent.click(screen.getByRole('button'));

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should cycle from dark to system', () => {
      vi.spyOn(useThemeModule, 'useTheme').mockReturnValue({
        themeMode: 'dark',
        resolvedTheme: 'dark',
        systemTheme: 'light',
        setTheme: mockSetTheme,
        toggleTheme: mockToggleTheme,
        isDark: true,
      });

      render(<ThemeToggle variant="icon" />);
      fireEvent.click(screen.getByRole('button'));

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });

    it('should cycle from system to light', () => {
      vi.spyOn(useThemeModule, 'useTheme').mockReturnValue({
        themeMode: 'system',
        resolvedTheme: 'light',
        systemTheme: 'light',
        setTheme: mockSetTheme,
        toggleTheme: mockToggleTheme,
        isDark: false,
      });

      render(<ThemeToggle variant="icon" />);
      fireEvent.click(screen.getByRole('button'));

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });
});
