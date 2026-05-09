import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PerformanceSettings } from './PerformanceSettings';
import { DEFAULT_SETTINGS } from '@/managers/SettingsManager';

describe('PerformanceSettings', () => {
  const mockOnSave = vi.fn();

  const defaultProps = {
    settings: DEFAULT_SETTINGS,
    onSave: mockOnSave,
    saving: false,
  };

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it('should render performance settings', () => {
    render(<PerformanceSettings {...defaultProps} />);

    expect(screen.getByText('Performance Settings')).toBeInTheDocument();
    expect(screen.getByText(/Items Per Page:/)).toBeInTheDocument();
    expect(screen.getByText('Image Quality')).toBeInTheDocument();
  });

  it('should display current page size', () => {
    render(<PerformanceSettings {...defaultProps} />);

    expect(screen.getByText('Items Per Page: 50')).toBeInTheDocument();
  });

  it('should change page size', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Items Per Page:/);
    fireEvent.change(slider, { target: { value: '100' } });

    expect(slider).toHaveValue('100');
    expect(screen.getByText('Items Per Page: 100')).toBeInTheDocument();
  });

  it('should display image quality selector', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const select = screen.getByLabelText('Image Quality');
    expect(select).toHaveValue('medium');
  });

  it('should change image quality', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const select = screen.getByLabelText('Image Quality');
    fireEvent.change(select, { target: { value: 'high' } });

    expect(select).toHaveValue('high');
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should display image preload count', () => {
    render(<PerformanceSettings {...defaultProps} />);

    expect(screen.getByText('Image Preload Count: 10')).toBeInTheDocument();
  });

  it('should change image preload count', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Image Preload Count:/);
    fireEvent.change(slider, { target: { value: '20' } });

    expect(slider).toHaveValue('20');
    expect(screen.getByText('Image Preload Count: 20')).toBeInTheDocument();
  });

  it('should display lazy loading checkbox', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Lazy Loading');
    expect(checkbox).toBeChecked();
  });

  it('should toggle lazy loading', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Lazy Loading');
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should display virtual scrolling checkbox', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Virtual Scrolling');
    expect(checkbox).toBeChecked();
  });

  it('should toggle virtual scrolling', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Virtual Scrolling');
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should display performance tips', () => {
    render(<PerformanceSettings {...defaultProps} />);

    expect(screen.getByText('💡 Performance Tips')).toBeInTheDocument();
    expect(screen.getByText(/Lower page size for faster initial loads/)).toBeInTheDocument();
  });

  it('should show save and cancel buttons when changes are made', () => {
    render(<PerformanceSettings {...defaultProps} />);

    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();

    const checkbox = screen.getByLabelText('Enable Lazy Loading');
    fireEvent.click(checkbox);

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onSave with updated settings', async () => {
    render(<PerformanceSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Items Per Page:/);
    fireEvent.change(slider, { target: { value: '100' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 100,
        })
      );
    });
  });

  it('should reset changes when cancel is clicked', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Lazy Loading');
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(checkbox).toBeChecked();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('should disable buttons when saving', () => {
    render(<PerformanceSettings {...defaultProps} saving={true} />);

    const checkbox = screen.getByLabelText('Enable Lazy Loading');
    fireEvent.click(checkbox);

    const saveButton = screen.getByText('Saving...');
    const cancelButton = screen.getByText('Cancel');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should save multiple changes at once', async () => {
    render(<PerformanceSettings {...defaultProps} />);

    const pageSlider = screen.getByLabelText(/Items Per Page:/);
    fireEvent.change(pageSlider, { target: { value: '100' } });

    const imageSelect = screen.getByLabelText('Image Quality');
    fireEvent.change(imageSelect, { target: { value: 'low' } });

    const lazyCheckbox = screen.getByLabelText('Enable Lazy Loading');
    fireEvent.click(lazyCheckbox);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 100,
          imageQuality: 'low',
          enableLazyLoading: false,
        })
      );
    });
  });

  it('should handle all image quality options', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const select = screen.getByLabelText('Image Quality');

    fireEvent.change(select, { target: { value: 'low' } });
    expect(select).toHaveValue('low');

    fireEvent.change(select, { target: { value: 'medium' } });
    expect(select).toHaveValue('medium');

    fireEvent.change(select, { target: { value: 'high' } });
    expect(select).toHaveValue('high');
  });

  it('should handle page size range limits', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Items Per Page:/);

    // Test minimum
    fireEvent.change(slider, { target: { value: '10' } });
    expect(slider).toHaveValue('10');

    // Test maximum
    fireEvent.change(slider, { target: { value: '200' } });
    expect(slider).toHaveValue('200');
  });

  it('should handle image preload count range limits', () => {
    render(<PerformanceSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Image Preload Count:/);

    // Test minimum
    fireEvent.change(slider, { target: { value: '0' } });
    expect(slider).toHaveValue('0');

    // Test maximum
    fireEvent.change(slider, { target: { value: '50' } });
    expect(slider).toHaveValue('50');
  });
});
