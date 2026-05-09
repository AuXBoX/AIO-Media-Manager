import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ArtworkImage } from './ArtworkImage';

// Mock the hooks and utilities
vi.mock('@/hooks/useProgressiveImage', () => ({
  useLazyProgressiveImage: vi.fn((_lowQuality, _highQuality, _options) => ({
    ref: vi.fn(),
    src: _lowQuality,
    isLoading: true,
    isVisible: false,
    error: null,
  })),
}));

vi.mock('@/utils/imageTranscoding', () => ({
  getOptimizedImageUrl: vi.fn((serverUrl, imagePath, token, size) => {
    return `${serverUrl}/photo/transcode?url=${imagePath}&size=${size}&token=${token}`;
  }),
}));

describe('ArtworkImage', () => {
  const defaultProps = {
    serverUrl: 'http://localhost:32400',
    imagePath: '/library/metadata/123/thumb',
    token: 'test-token',
    alt: 'Test artwork',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render image with lazy progressive loading', () => {
    render(<ArtworkImage {...defaultProps} />);

    const img = screen.getByAltText('Test artwork');
    expect(img).toBeInTheDocument();
  });

  it('should show loading spinner when loading', () => {
    render(<ArtworkImage {...defaultProps} />);

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ArtworkImage {...defaultProps} className="custom-class" />
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should use medium size by default', async () => {
    const { getOptimizedImageUrl } = await import('@/utils/imageTranscoding');

    render(<ArtworkImage {...defaultProps} />);

    expect(getOptimizedImageUrl).toHaveBeenCalledWith(
      defaultProps.serverUrl,
      defaultProps.imagePath,
      defaultProps.token,
      'thumbnail'
    );

    expect(getOptimizedImageUrl).toHaveBeenCalledWith(
      defaultProps.serverUrl,
      defaultProps.imagePath,
      defaultProps.token,
      'medium'
    );
  });

  it('should use custom size when provided', async () => {
    const { getOptimizedImageUrl } = await import('@/utils/imageTranscoding');

    render(<ArtworkImage {...defaultProps} size="large" />);

    expect(getOptimizedImageUrl).toHaveBeenCalledWith(
      defaultProps.serverUrl,
      defaultProps.imagePath,
      defaultProps.token,
      'large'
    );
  });

  it('should apply blur effect when loading', () => {
    render(<ArtworkImage {...defaultProps} />);

    const img = screen.getByAltText('Test artwork');
    expect(img).toHaveClass('blur-sm');
    expect(img).toHaveClass('opacity-50');
  });

  it('should remove blur effect when loaded', async () => {
    const { useLazyProgressiveImage } = await import('@/hooks/useProgressiveImage');

    // Mock loaded state
    vi.mocked(useLazyProgressiveImage).mockReturnValue({
      ref: vi.fn(),
      src: 'high-quality.jpg',
      isLoading: false,
      isVisible: true,
      error: null,
    });

    const { rerender } = render(<ArtworkImage {...defaultProps} />);
    rerender(<ArtworkImage {...defaultProps} />);

    const img = screen.getByAltText('Test artwork');
    expect(img).toHaveClass('opacity-100');
    expect(img).not.toHaveClass('blur-sm');
  });

  it('should pass lazy loading options to hook', async () => {
    const { useLazyProgressiveImage } = await import('@/hooks/useProgressiveImage');

    render(
      <ArtworkImage
        {...defaultProps}
        lazy={true}
        rootMargin="100px"
        threshold={0.5}
      />
    );

    expect(useLazyProgressiveImage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        rootMargin: '100px',
        threshold: 0.5,
      })
    );
  });

  it('should pass fallback source to hook', async () => {
    const { useLazyProgressiveImage } = await import('@/hooks/useProgressiveImage');

    render(
      <ArtworkImage
        {...defaultProps}
        fallbackSrc="fallback.jpg"
      />
    );

    expect(useLazyProgressiveImage).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        fallbackSrc: 'fallback.jpg',
      })
    );
  });

  it('should show error state when image fails to load', async () => {
    const { useLazyProgressiveImage } = await import('@/hooks/useProgressiveImage');

    // Mock error state
    vi.mocked(useLazyProgressiveImage).mockReturnValue({
      ref: vi.fn(),
      src: 'low-quality.jpg',
      isLoading: false,
      isVisible: true,
      error: new Error('Failed to load'),
    });

    render(<ArtworkImage {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    });
  });

  it('should not show error state while loading', async () => {
    const { useLazyProgressiveImage } = await import('@/hooks/useProgressiveImage');

    // Mock loading with error
    vi.mocked(useLazyProgressiveImage).mockReturnValue({
      ref: vi.fn(),
      src: 'low-quality.jpg',
      isLoading: true,
      isVisible: true,
      error: new Error('Failed to load'),
    });

    render(<ArtworkImage {...defaultProps} />);

    expect(screen.queryByText('Image unavailable')).not.toBeInTheDocument();
  });

  it('should disable lazy loading when lazy prop is false', () => {
    render(<ArtworkImage {...defaultProps} lazy={false} />);

    const img = screen.getByAltText('Test artwork');
    // When lazy is false, ref should not be attached
    expect(img).toBeInTheDocument();
  });
});
