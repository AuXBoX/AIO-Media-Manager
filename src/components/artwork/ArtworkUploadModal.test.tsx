import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArtworkUploadModal } from './ArtworkUploadModal';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('ArtworkUploadModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpload = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onUpload: mockOnUpload,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnUpload.mockResolvedValue(undefined);
  });

  it('does not render when closed', () => {
    const { container } = render(
      <ArtworkUploadModal {...defaultProps} isOpen={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders when open', () => {
    render(<ArtworkUploadModal {...defaultProps} />);

    expect(screen.getByText('Upload Artwork')).toBeInTheDocument();
  });

  it('displays artwork type selection buttons', () => {
    render(<ArtworkUploadModal {...defaultProps} />);

    expect(screen.getByText('poster')).toBeInTheDocument();
    expect(screen.getByText('background')).toBeInTheDocument();
    expect(screen.getByText('banner')).toBeInTheDocument();
    expect(screen.getByText('thumb')).toBeInTheDocument();
  });

  it('selects default artwork type', () => {
    render(<ArtworkUploadModal {...defaultProps} defaultType="background" />);

    const backgroundButton = screen.getByText('background');
    expect(backgroundButton).toHaveClass('bg-primary-500');
  });

  it('allows switching artwork type', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const bannerButton = screen.getByText('banner');
    await user.click(bannerButton);

    expect(bannerButton).toHaveClass('bg-primary-500');
  });

  it('displays drag and drop area', () => {
    render(<ArtworkUploadModal {...defaultProps} />);

    expect(screen.getByText(/Drag and drop an image/)).toBeInTheDocument();
    expect(screen.getByText('Browse Files')).toBeInTheDocument();
  });

  it('opens file picker when browse button is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const browseButton = screen.getByText('Browse Files');
    await user.click(browseButton);

    // File input should exist (even though hidden)
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
  });

  it('accepts file selection via input', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });
  });

  it('displays preview after file selection', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      const preview = screen.getByAltText('Preview');
      expect(preview).toBeInTheDocument();
    });
  });

  it('displays file size', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText(/MB/)).toBeInTheDocument();
    });
  });

  it('allows removing selected file', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    const removeButton = screen.getByLabelText('Remove file');
    await user.click(removeButton);

    expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
    expect(screen.getByText(/Drag and drop an image/)).toBeInTheDocument();
  });

  it('validates file type', async () => {
    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Manually trigger the change event with the file
    Object.defineProperty(fileInput, 'files', {
      value: [file],
      writable: false,
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText('Please select an image file')).toBeInTheDocument();
    });
  });

  it('validates file size', async () => {
    render(<ArtworkUploadModal {...defaultProps} />);

    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Manually trigger the change event with the file
    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      writable: false,
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    await waitFor(() => {
      expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument();
    });
  });

  it('disables upload button when no file selected', () => {
    render(<ArtworkUploadModal {...defaultProps} />);

    const uploadButton = screen.getByText('Upload');
    expect(uploadButton).toBeDisabled();
  });

  it('enables upload button when file is selected', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      const uploadButton = screen.getByText('Upload');
      expect(uploadButton).not.toBeDisabled();
    });
  });

  it('calls onUpload with file and type when upload button is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    const uploadButton = screen.getByText('Upload');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file, 'poster');
    });
  });

  it('displays success message after upload', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    const uploadButton = screen.getByText('Upload');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Artwork uploaded successfully!')).toBeInTheDocument();
    });
  });

  it('displays error message on upload failure', async () => {
    const user = userEvent.setup();
    mockOnUpload.mockRejectedValue(new Error('Upload failed'));

    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    const uploadButton = screen.getByText('Upload');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('shows uploading state during upload', async () => {
    const user = userEvent.setup();
    let resolveUpload: () => void;
    mockOnUpload.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpload = resolve;
        })
    );

    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    const uploadButton = screen.getByText('Upload');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
    });

    // Clean up
    resolveUpload!();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    const backdrop = screen.getByText('Upload Artwork').closest('div')?.previousSibling;
    if (backdrop) {
      await user.click(backdrop as Element);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('uploads with selected artwork type', async () => {
    const user = userEvent.setup();
    render(<ArtworkUploadModal {...defaultProps} />);

    // Select background type
    const backgroundButton = screen.getByText('background');
    await user.click(backgroundButton);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    const uploadButton = screen.getByText('Upload');
    await user.click(uploadButton);

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(file, 'background');
    });
  });

  it('cleans up preview URL on close', async () => {
    const user = userEvent.setup();

    render(<ArtworkUploadModal {...defaultProps} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    const closeButton = screen.getByLabelText('Close');
    await user.click(closeButton);

    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });
});
