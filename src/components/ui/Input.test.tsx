import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('renders basic input', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Username" />);
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
    });

    it('renders with hint text', () => {
      render(<Input hint="This is a helpful hint" />);
      expect(screen.getByText('This is a helpful hint')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(<Input error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('renders with left icon', () => {
      const icon = <svg data-testid="left-icon" />;
      render(<Input leftIcon={icon} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('renders with right icon', () => {
      const icon = <svg data-testid="right-icon" />;
      render(<Input rightIcon={icon} />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('renders with both left and right icons', () => {
      const leftIcon = <svg data-testid="left-icon" />;
      const rightIcon = <svg data-testid="right-icon" />;
      render(<Input leftIcon={leftIcon} rightIcon={rightIcon} />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('applies error styles when error prop is provided', () => {
      render(<Input error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-error-500');
    });

    it('shows error message instead of hint when both are provided', () => {
      render(<Input hint="Hint text" error="Error message" />);
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
    });

    it('applies disabled styles when disabled', () => {
      render(<Input disabled label="Disabled Input" />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('applies disabled styles to label when disabled', () => {
      render(<Input disabled label="Disabled Input" />);
      const label = screen.getByText('Disabled Input');
      expect(label).toHaveClass('opacity-50');
    });
  });

  describe('Focus States', () => {
    it('has focus ring styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:ring-3', 'focus:border-primary-500');
    });

    it('has error focus ring when in error state', () => {
      render(<Input error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('focus:border-error-600', 'focus:ring-error-500/10');
    });
  });

  describe('Icon Padding', () => {
    it('applies left padding when left icon is present', () => {
      const icon = <svg data-testid="left-icon" />;
      render(<Input leftIcon={icon} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-11');
    });

    it('applies right padding when right icon is present', () => {
      const icon = <svg data-testid="right-icon" />;
      render(<Input rightIcon={icon} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pr-11');
    });

    it('applies both paddings when both icons are present', () => {
      const leftIcon = <svg data-testid="left-icon" />;
      const rightIcon = <svg data-testid="right-icon" />;
      render(<Input leftIcon={leftIcon} rightIcon={rightIcon} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-11', 'pr-11');
    });
  });

  describe('Interactions', () => {
    it('calls onChange handler when value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      expect(handleChange).toHaveBeenCalled();
    });

    it('does not call onChange when disabled', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} disabled />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('accepts user input', async () => {
      const user = userEvent.setup();
      render(<Input />);
      
      const input = screen.getByRole('textbox') as HTMLInputElement;
      await user.type(input, 'Hello World');
      
      expect(input.value).toBe('Hello World');
    });
  });

  describe('Accessibility', () => {
    it('has proper textbox role', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('associates label with input', () => {
      render(<Input label="Email Address" />);
      const input = screen.getByLabelText('Email Address');
      expect(input).toBeInTheDocument();
    });

    it('marks error message with alert role', () => {
      render(<Input error="This field is required" />);
      const errorMessage = screen.getByText('This field is required');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('does not mark hint text with alert role', () => {
      render(<Input hint="Helpful hint" />);
      const hintText = screen.getByText('Helpful hint');
      expect(hintText).not.toHaveAttribute('role', 'alert');
    });

    it('forwards ref correctly', () => {
      const ref = vi.fn();
      render(<Input ref={ref} />);
      expect(ref).toHaveBeenCalled();
    });

    it('marks icons as aria-hidden', () => {
      const leftIcon = <svg data-testid="left-icon" />;
      const rightIcon = <svg data-testid="right-icon" />;
      render(<Input leftIcon={leftIcon} rightIcon={rightIcon} />);
      
      const leftIconContainer = screen.getByTestId('left-icon').parentElement;
      const rightIconContainer = screen.getByTestId('right-icon').parentElement;
      
      expect(leftIconContainer).toHaveAttribute('aria-hidden', 'true');
      expect(rightIconContainer).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Custom styling', () => {
    it('accepts custom className for input', () => {
      render(<Input className="custom-input-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-input-class');
    });

    it('accepts custom className for container', () => {
      render(<Input containerClassName="custom-container-class" />);
      const input = screen.getByRole('textbox');
      const container = input.closest('.custom-container-class');
      expect(container).toBeInTheDocument();
    });

    it('accepts custom className for label', () => {
      render(<Input label="Custom Label" labelClassName="custom-label-class" />);
      const label = screen.getByText('Custom Label');
      expect(label).toHaveClass('custom-label-class');
    });

    it('merges custom className with default classes', () => {
      render(<Input className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class', 'w-full', 'px-4', 'py-2.5');
    });
  });

  describe('HTML attributes', () => {
    it('forwards HTML input attributes', () => {
      render(<Input type="email" name="email" required />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('name', 'email');
      expect(input).toHaveAttribute('required');
    });

    it('supports placeholder attribute', () => {
      render(<Input placeholder="Enter your email" />);
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    });

    it('supports value attribute', () => {
      render(<Input value="test value" onChange={() => {}} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('test value');
    });

    it('supports data attributes', () => {
      render(<Input data-testid="custom-test-id" />);
      expect(screen.getByTestId('custom-test-id')).toBeInTheDocument();
    });
  });

  describe('Input types', () => {
    it('supports text type (default)', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      // HTML inputs default to type="text" even without explicit attribute
      expect(input).toBeInTheDocument();
    });

    it('supports email type', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('supports password type', () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('supports number type', () => {
      render(<Input type="number" />);
      const input = document.querySelector('input[type="number"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Visual Specs Compliance', () => {
    it('has correct base styles', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'bg-white',
        'border',
        'rounded-lg',
        'px-4',
        'py-2.5',
        'text-sm'
      );
    });

    it('has correct label styles', () => {
      render(<Input label="Test Label" />);
      const label = screen.getByText('Test Label');
      expect(label).toHaveClass('text-sm', 'font-medium', 'text-text-primary');
    });

    it('has correct hint text styles', () => {
      render(<Input hint="Test hint" />);
      const hint = screen.getByText('Test hint');
      expect(hint).toHaveClass('text-xs', 'text-text-tertiary');
    });

    it('has correct error text styles', () => {
      render(<Input error="Test error" />);
      const error = screen.getByText('Test error');
      expect(error).toHaveClass('text-xs', 'text-error-600');
    });
  });
});
