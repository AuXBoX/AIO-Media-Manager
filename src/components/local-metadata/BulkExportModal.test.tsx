import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkExportModal } from './BulkExportModal';
import { BulkExportResult } from '../../managers/LocalMetadataManager';

describe('BulkExportModal', () => {
  const mockOnClose = vi.fn();
  const mockOnExport = vi.fn();

  const selectedItems = ['1', '2', '3'];
  const itemTitles = {
    '1': 'Movie 1',
    '2': 'Movie 2',
    '3': 'Movie 3',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(
      <BulkExportModal
        isOpen={false}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    expect(screen.queryByText('Bulk Export to Local Files')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('Bulk Export to Local Files')).toBeInTheDocument();
    expect(screen.getByText('Export metadata for 3 selected items')).toBeInTheDocument();
  });

  it('should display singular text for single item', () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={['1']}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('Export metadata for 1 selected item')).toBeInTheDocument();
  });

  it('should render all format options', () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('NFO Files')).toBeInTheDocument();
    expect(screen.getByText('Embedded Tags')).toBeInTheDocument();
    expect(screen.getByText('Both NFO and Embedded')).toBeInTheDocument();
  });

  it('should have NFO format selected by default', () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const nfoRadio = screen.getByDisplayValue('nfo');
    expect(nfoRadio).toBeChecked();
  });

  it('should allow changing format selection', () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const embeddedRadio = screen.getByDisplayValue('embedded');
    fireEvent.click(embeddedRadio);

    expect(embeddedRadio).toBeChecked();
  });

  it('should display selected items when 10 or fewer', () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    expect(screen.getByText('Selected Items')).toBeInTheDocument();
    expect(screen.getByText('• Movie 1')).toBeInTheDocument();
    expect(screen.getByText('• Movie 2')).toBeInTheDocument();
    expect(screen.getByText('• Movie 3')).toBeInTheDocument();
  });

  it('should not display item list when more than 10 items', () => {
    const manyItems = Array.from({ length: 15 }, (_, i) => `${i + 1}`);
    const manyTitles = Object.fromEntries(manyItems.map((id) => [id, `Movie ${id}`]));

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={manyItems}
        itemTitles={manyTitles}
        onExport={mockOnExport}
      />
    );

    expect(screen.queryByText('Selected Items')).not.toBeInTheDocument();
  });

  it('should call onExport with selected format when Export button is clicked', async () => {
    const mockResult: BulkExportResult = {
      total: 3,
      succeeded: 3,
      failed: 0,
      errors: [],
    };
    mockOnExport.mockResolvedValue(mockResult);

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    // Select embedded format
    const embeddedRadio = screen.getByDisplayValue('embedded');
    fireEvent.click(embeddedRadio);

    // Click export
    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(mockOnExport).toHaveBeenCalledWith('embedded');
    });
  });

  it('should show loading state during export', async () => {
    mockOnExport.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportButton);

    expect(screen.getByText('Exporting metadata...')).toBeInTheDocument();
    expect(screen.getByText('This may take a few moments')).toBeInTheDocument();
  });

  it('should disable buttons during export', async () => {
    mockOnExport.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });

    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  });

  it('should display success results after successful export', async () => {
    const mockResult: BulkExportResult = {
      total: 3,
      succeeded: 3,
      failed: 0,
      errors: [],
    };
    mockOnExport.mockResolvedValue(mockResult);

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Export Completed Successfully')).toBeInTheDocument();
      expect(
        screen.getByText('All 3 items were exported to local files.')
      ).toBeInTheDocument();
    });
  });

  it('should display partial success results', async () => {
    const mockResult: BulkExportResult = {
      total: 3,
      succeeded: 2,
      failed: 1,
      errors: [{ ratingKey: '3', error: 'File not found' }],
    };
    mockOnExport.mockResolvedValue(mockResult);

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export Partially Completed')).toBeInTheDocument();
      expect(
        screen.getByText('2 items exported successfully, 1 items failed.')
      ).toBeInTheDocument();
    });
  });

  it('should display error list when export has failures', async () => {
    const mockResult: BulkExportResult = {
      total: 3,
      succeeded: 1,
      failed: 2,
      errors: [
        { ratingKey: '2', error: 'Permission denied' },
        { ratingKey: '3', error: 'File not found' },
      ],
    };
    mockOnExport.mockResolvedValue(mockResult);

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Errors (2)')).toBeInTheDocument();
      expect(screen.getByText(/Movie 2:/)).toBeInTheDocument();
      expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
      expect(screen.getByText(/Movie 3:/)).toBeInTheDocument();
      expect(screen.getByText(/File not found/)).toBeInTheDocument();
    });
  });

  it('should display error message when export fails', async () => {
    mockOnExport.mockRejectedValue(new Error('Network error'));

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should call onClose when Cancel button is clicked', () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when Close button is clicked after export', async () => {
    const mockResult: BulkExportResult = {
      total: 3,
      succeeded: 3,
      failed: 0,
      errors: [],
    };
    mockOnExport.mockResolvedValue(mockResult);

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export Completed Successfully')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: /Close/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not allow closing during export', async () => {
    mockOnExport.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportButton);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // onClose should not be called during export
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should disable Export button when no items selected', () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={[]}
        itemTitles={{}}
        onExport={mockOnExport}
      />
    );

    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    expect(exportButton).toBeDisabled();
  });

  it('should reset state when modal is closed and reopened', async () => {
    const mockResult: BulkExportResult = {
      total: 3,
      succeeded: 3,
      failed: 0,
      errors: [],
    };
    mockOnExport.mockResolvedValue(mockResult);

    const { rerender } = render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    // Export
    const exportButton = screen.getByRole('button', { name: /^Export$/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export Completed Successfully')).toBeInTheDocument();
    });

    // Close modal
    rerender(
      <BulkExportModal
        isOpen={false}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    // Reopen modal
    rerender(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    // Should not show results anymore
    expect(screen.queryByText('Export Completed Successfully')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Export$/i })).toBeInTheDocument();
  });

  it('should display format descriptions', () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        selectedItems={selectedItems}
        itemTitles={itemTitles}
        onExport={mockOnExport}
      />
    );

    expect(
      screen.getByText(/Export metadata to NFO files \(Kodi\/Emby compatible XML files\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Write metadata tags directly into media files \(ID3\/MP4 tags\)/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Export to both NFO files and embedded tags/i)
    ).toBeInTheDocument();
  });
});
