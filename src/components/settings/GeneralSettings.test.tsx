import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GeneralSettings } from './GeneralSettings';
import { DEFAULT_SETTINGS } from '@/managers/SettingsManager';

describe('GeneralSettings', () => {
  const mockOnSave = vi.fn();

  const defaultProps = {
    settings: DEFAULT_SETTINGS,
    onSave: mockOnSave,
    saving: false,
  };

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it('should render general settings', () => {
    render(<GeneralSettings {...defaultProps} />);

    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('Default View Mode')).toBeInTheDocument();
  });

  it('should display current theme selection', () => {
    render(<GeneralSettings {...defaultProps} />);

    const systemRadio = screen.getByLabelText(/System/);
    expect(systemRadio).toBeChecked();
  });

  it('should change theme selection', () => {
    render(<GeneralSettings {...defaultProps} />);

    const darkRadio = screen.getByLabelText(/Dark/);
    fireEvent.click(darkRadio);

    expect(darkRadio).toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should change language', () => {
    render(<GeneralSettings {...defaultProps} />);

    const languageSelect = screen.getByLabelText('Language');
    fireEvent.change(languageSelect, { target: { value: 'es' } });

    expect(languageSelect).toHaveValue('es');
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should change default view mode', () => {
    render(<GeneralSettings {...defaultProps} />);

    const listRadio = screen.getByLabelText(/List/);
    fireEvent.click(listRadio);

    expect(listRadio).toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should show grid columns slider when grid view is selected', () => {
    render(<GeneralSettings {...defaultProps} />);

    expect(screen.getByText(/Grid Columns:/)).toBeInTheDocument();
  });

  it('should hide grid columns slider when list view is selected', () => {
    render(<GeneralSettings {...defaultProps} />);

    const listRadio = screen.getByLabelText(/List/);
    fireEvent.click(listRadio);

    expect(screen.queryByText(/Grid Columns:/)).not.toBeInTheDocument();
  });

  it('should change grid columns', () => {
    render(<GeneralSettings {...defaultProps} />);

    const slider = screen.getByLabelText(/Grid Columns:/);
    fireEvent.change(slider, { target: { value: '6' } });

    expect(slider).toHaveValue('6');
    expect(screen.getByText('Grid Columns: 6')).toBeInTheDocument();
  });

  it('should change thumbnail quality', () => {
    render(<GeneralSettings {...defaultProps} />);

    const qualitySelect = screen.getByLabelText('Thumbnail Quality');
    fireEvent.change(qualitySelect, { target: { value: 'high' } });

    expect(qualitySelect).toHaveValue('high');
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should show save and cancel buttons when changes are made', () => {
    render(<GeneralSettings {...defaultProps} />);

    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();

    const darkRadio = screen.getByLabelText(/Dark/);
    fireEvent.click(darkRadio);

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onSave with updated settings', async () => {
    render(<GeneralSettings {...defaultProps} />);

    const darkRadio = screen.getByLabelText(/Dark/);
    fireEvent.click(darkRadio);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
        })
      );
    });
  });

  it('should reset changes when cancel is clicked', () => {
    render(<GeneralSettings {...defaultProps} />);

    const darkRadio = screen.getByLabelText(/Dark/);
    fireEvent.click(darkRadio);

    expect(darkRadio).toBeChecked();

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    const systemRadio = screen.getByLabelText(/System/);
    expect(systemRadio).toBeChecked();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('should disable buttons when saving', () => {
    render(<GeneralSettings {...defaultProps} saving={true} />);

    const darkRadio = screen.getByLabelText(/Dark/);
    fireEvent.click(darkRadio);

    const saveButton = screen.getByText('Saving...');
    const cancelButton = screen.getByText('Cancel');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should save multiple changes at once', async () => {
    render(<GeneralSettings {...defaultProps} />);

    const darkRadio = screen.getByLabelText(/Dark/);
    fireEvent.click(darkRadio);

    const languageSelect = screen.getByLabelText('Language');
    fireEvent.change(languageSelect, { target: { value: 'fr' } });

    const gridSlider = screen.getByLabelText(/Grid Columns:/);
    fireEvent.change(gridSlider, { target: { value: '8' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark',
          language: 'fr',
          gridColumns: 8,
        })
      );
    });
  });
});
