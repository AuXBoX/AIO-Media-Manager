import { useState, useRef } from 'react';

interface CoverArtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (imageData: Blob) => void;
  playlistTitle?: string;
  currentCoverUrl?: string | null;
  albumArtUrls?: string[];
}

export function CoverArtModal({ 
  isOpen, 
  onClose, 
  onUpload, 
  playlistTitle, 
  currentCoverUrl,
  albumArtUrls = [] 
}: CoverArtModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCoverUrl || null);
  const [selectedBlob, setSelectedBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedBlob(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleSelectAlbumArt = (url: string) => {
    // Fetch the image and convert to blob
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        setPreviewUrl(url);
        setSelectedBlob(blob);
      })
      .catch(err => console.error('Failed to load image:', err));
  };

  const handleUpload = async () => {
    if (!selectedBlob) return;
    
    try {
      setUploading(true);
      await onUpload(selectedBlob);
      handleClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(currentCoverUrl || null);
    setSelectedBlob(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Change Cover Art</h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {playlistTitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{playlistTitle}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current/Preview */}
          <div className="flex justify-center">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Cover preview" 
                className="w-48 h-48 rounded-xl object-cover shadow-lg"
              />
            ) : (
              <div className="w-48 h-48 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
          </div>

          {/* Upload zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragOver 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-primary-500">Click to upload</span> or drag and drop
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Album art from playlist tracks */}
          {albumArtUrls.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Or choose from album art in this playlist:
              </h3>
              <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                {albumArtUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectAlbumArt(url)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      previewUrl === url 
                        ? 'border-primary-500 ring-2 ring-primary-500/30' 
                        : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <img 
                      src={url} 
                      alt={`Album art ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedBlob || uploading}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors flex items-center gap-2"
          >
            {uploading && (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            )}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
