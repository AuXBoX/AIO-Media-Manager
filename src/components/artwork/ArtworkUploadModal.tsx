import React, { useState, useRef, DragEvent } from 'react';
import { ArtworkType } from '@/managers/MetadataManager';
import { Modal, ModalButton } from '@/components/ui/Modal';

interface ArtworkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, type: ArtworkType) => Promise<void>;
  defaultType?: ArtworkType;
}

/**
 * ArtworkUploadModal Component
 * 
 * Modal for uploading custom artwork with drag-and-drop support
 * Updated with modern Plex Pro design system
 */
export const ArtworkUploadModal: React.FC<ArtworkUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  defaultType = 'poster',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [artworkType, setArtworkType] = useState<ArtworkType>(defaultType);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(selectedFile, artworkType);
      setUploadSuccess(true);

      // Close modal after a short delay
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Reset state
    setSelectedFile(null);
    setPreviewUrl(null);
    setArtworkType(defaultType);
    setIsDragging(false);
    setIsUploading(false);
    setUploadSuccess(false);
    setError(null);

    onClose();
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Artwork"
      maxWidth="2xl"
      footer={
        <>
          <ModalButton variant="secondary" onClick={handleClose} disabled={isUploading}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-6">
        {/* Success Message */}
        {uploadSuccess && (
          <div className="p-4 bg-success-50 border border-success-200 rounded-xl">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-success-500 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium text-success-800">
                Artwork uploaded successfully!
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-error-50 border border-error-200 rounded-xl">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-error-500 mr-3 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-error-800">Error</p>
                <p className="text-sm text-error-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Artwork Type Selection */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            Artwork Type
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['poster', 'background', 'banner', 'thumb'] as ArtworkType[]).map((type) => (
              <button
                key={type}
                onClick={() => setArtworkType(type)}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-150 capitalize ${
                  artworkType === type
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-background-secondary text-text-secondary hover:bg-primary-subtle hover:text-primary-500'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* File Upload Area */}
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-150 ${
              isDragging
                ? 'border-primary-500 bg-primary-subtle'
                : 'border-border hover:border-border-hover hover:bg-background-secondary'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <svg
              className="mx-auto h-12 w-12 text-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-4 text-sm text-text-secondary">
              {isDragging ? 'Drop image here' : 'Drag and drop an image, or'}
            </p>
            <button
              onClick={handleBrowseClick}
              className="mt-3 px-5 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all duration-150 font-medium text-sm"
            >
              Browse Files
            </button>
            <p className="mt-3 text-xs text-text-tertiary">
              PNG, JPG, GIF up to 10MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        ) : (
          /* Preview Area */
          <div className="space-y-4">
            <div className="relative bg-background-secondary rounded-xl overflow-hidden">
              <img
                src={previewUrl || ''}
                alt="Preview"
                className="w-full max-h-96 object-contain"
              />
              <button
                onClick={handleRemoveFile}
                className="absolute top-3 right-3 p-2 bg-error-500 text-white rounded-lg hover:bg-error-600 transition-all duration-150 shadow-lg"
                aria-label="Remove file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* File Info */}
            <div className="flex items-center justify-between p-4 bg-background-secondary rounded-xl">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-8 h-8 text-text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ArtworkUploadModal;
