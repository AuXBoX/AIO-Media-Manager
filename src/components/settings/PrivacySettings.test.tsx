import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PrivacySettings } from './PrivacySettings';
import { DEFAULT_SETTINGS } from '@/managers/SettingsManager';

describe('PrivacySettings', () => {
  const mockOnSave = vi.fn();

  const defaultProps = {
    settings: DEFAULT_SETTINGS,
    onSave: mockOnSave,
    saving: false,
  };

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it('should render privacy settings', () => {
    render(<PrivacySettings {...defaultProps} />);

    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
    expect(screen.getByText('Enable Analytics')).toBeInTheDocument();
    expect(screen.getByText('Enable Error Reporting')).toBeInTheDocument();
    expect(screen.getByText('Share Usage Statistics')).toBeInTheDocument();
  });

  it('should display analytics checkbox', () => {
    render(<PrivacySettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Analytics');
    expect(checkbox).not.toBeChecked(); // Default is false
  });

  it('should toggle analytics', () => {
    render(<PrivacySettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Analytics');
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should display error reporting checkbox', () => {
    render(<PrivacySettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Error Reporting');
    expect(checkbox).toBeChecked(); // Default is true
  });

  it('should toggle error reporting', () => {
    render(<PrivacySettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Error Reporting');
    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should display usage statistics checkbox', () => {
    render(<PrivacySettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Share Usage Statistics');
    expect(checkbox).not.toBeChecked(); // Default is false
  });

  it('should toggle usage statistics', () => {
    render(<PrivacySettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Share Usage Statistics');
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('should display analytics data collection info', () => {
    render(<PrivacySettings {...defaultProps} />);

    expect(screen.getByText(/Feature usage, page views, session duration/)).toBeInTheDocument();
  });

  it('should display error reporting data collection info', () => {
    render(<PrivacySettings {...defaultProps} />);

    expect(screen.getByText(/Error messages, stack traces, application state/)).toBeInTheDocument();
  });

  it('should display usage statistics data collection info', () => {
    render(<PrivacySettings {...defaultProps} />);

    expect(screen.getByText(/Library sizes, operation counts, feature adoption/)).toBeInTheDocument();
  });

  it('should display privacy notice', () => {
    render(<PrivacySettings {...defaultProps} />);

    expect(screen.getByText('🔒 Your Privacy Matters')).toBeInTheDocument();
    expect(screen.getByText(/collect personal information, passwords, or media content/)).toBeInTheDocument();
    expect(screen.getByText(/sell or share your data with third parties/)).toBeInTheDocument();
  });

  it('should display recommended settings', () => {
    render(<PrivacySettings {...defaultProps} />);

    expect(screen.getByText('💡 Recommended Settings')).toBeInTheDocument();
    expect(screen.getByText(/recommend enabling/)).toBeInTheDocument();
  });

  it('should show save and cancel buttons when changes are made', () => {
    render(<PrivacySettings {...defaultProps} />);

    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();

    const checkbox = screen.getByLabelText('Enable Analytics');
    fireEvent.click(checkbox);

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onSave with updated settings', async () => {
    render(<PrivacySettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Analytics');
    fireEvent.click(checkbox);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          analyticsEnabled: true,
        })
      );
    });
  });

  it('should reset changes when cancel is clicked', () => {
    render(<PrivacySettings {...defaultProps} />);

    const checkbox = screen.getByLabelText('Enable Analytics');
    fireEvent.click(checkbox);

    expect(checkbox).toBeChecked();

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(checkbox).not.toBeChecked();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('should disable buttons when saving', () => {
    render(<PrivacySettings {...defaultProps} saving={true} />);

    const checkbox = screen.getByLabelText('Enable Analytics');
    fireEvent.click(checkbox);

    const saveButton = screen.getByText('Saving...');
    const cancelButton = screen.getByText('Cancel');

    expect(saveButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should save multiple changes at once', async () => {
    render(<PrivacySettings {...defaultProps} />);

    const analyticsCheckbox = screen.getByLabelText('Enable Analytics');
    fireEvent.click(analyticsCheckbox);

    const errorCheckbox = screen.getByLabelText('Enable Error Reporting');
    fireEvent.click(errorCheckbox);

    const usageCheckbox = screen.getByLabelText('Share Usage Statistics');
    fireEvent.click(usageCheckbox);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          analyticsEnabled: true,
          errorReporting: false,
          usageStatistics: true,
        })
      );
    });
  });

  it('should display all privacy guarantees', () => {
    render(<PrivacySettings {...defaultProps} />);

    expect(screen.getByText(/All data collection is/)).toBeInTheDocument();
    expect(screen.getByText(/collect personal information, passwords, or media content/)).toBeInTheDocument();
    expect(screen.getByText(/All collected data is/)).toBeInTheDocument();
    expect(screen.getByText(/Data is used/)).toBeInTheDocument();
    expect(screen.getByText(/sell or share your data with third parties/)).toBeInTheDocument();
  });

  it('should handle toggling all settings off', async () => {
    const allEnabledSettings = {
      ...DEFAULT_SETTINGS,
      analyticsEnabled: true,
      errorReporting: true,
      usageStatistics: true,
    };

    render(<PrivacySettings {...defaultProps} settings={allEnabledSettings} />);

    const analyticsCheckbox = screen.getByLabelText('Enable Analytics');
    const errorCheckbox = screen.getByLabelText('Enable Error Reporting');
    const usageCheckbox = screen.getByLabelText('Share Usage Statistics');

    fireEvent.click(analyticsCheckbox);
    fireEvent.click(errorCheckbox);
    fireEvent.click(usageCheckbox);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          analyticsEnabled: false,
          errorReporting: false,
          usageStatistics: false,
        })
      );
    });
  });

  it('should handle toggling all settings on', async () => {
    const allDisabledSettings = {
      ...DEFAULT_SETTINGS,
      analyticsEnabled: false,
      errorReporting: false,
      usageStatistics: false,
    };

    render(<PrivacySettings {...defaultProps} settings={allDisabledSettings} />);

    const analyticsCheckbox = screen.getByLabelText('Enable Analytics');
    const errorCheckbox = screen.getByLabelText('Enable Error Reporting');
    const usageCheckbox = screen.getByLabelText('Share Usage Statistics');

    fireEvent.click(analyticsCheckbox);
    fireEvent.click(errorCheckbox);
    fireEvent.click(usageCheckbox);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          analyticsEnabled: true,
          errorReporting: true,
          usageStatistics: true,
        })
      );
    });
  });
});
