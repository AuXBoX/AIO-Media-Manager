import { describe, it, expect, vi } from 'vitest';
import {
  getTranscodedImageUrl,
  getOptimizedImageUrl,
  getCompositeImageUrl,
  preloadImage,
  preloadImages,
  getResponsiveSrcSet,
  calculateOptimalDimensions,
} from './imageTranscoding';

describe('imageTranscoding', () => {
  const serverUrl = 'http://localhost:32400';
  const imagePath = '/library/metadata/123/thumb';
  const token = 'test-token';

  describe('getTranscodedImageUrl', () => {
    it('should generate basic transcoded URL', () => {
      const url = getTranscodedImageUrl(serverUrl, imagePath, token);

      expect(url).toContain('/photo/:/transcode');
      expect(url).toContain(`url=${encodeURIComponent(imagePath)}`);
      expect(url).toContain(`X-Plex-Token=${token}`);
    });

    it('should include width and height parameters', () => {
      const url = getTranscodedImageUrl(serverUrl, imagePath, token, {
        width: 300,
        height: 300,
      });

      expect(url).toContain('width=300');
      expect(url).toContain('height=300');
    });

    it('should include optional parameters', () => {
      const url = getTranscodedImageUrl(serverUrl, imagePath, token, {
        width: 300,
        minSize: true,
        upscale: true,
        format: 'jpg',
        quality: 85,
      });

      expect(url).toContain('minSize=1');
      expect(url).toContain('upscale=1');
      expect(url).toContain('format=jpg');
      expect(url).toContain('quality=85');
    });

    it('should handle empty options', () => {
      const url = getTranscodedImageUrl(serverUrl, imagePath, token, {});

      expect(url).toContain('/photo/:/transcode');
      expect(url).toContain(`url=${encodeURIComponent(imagePath)}`);
      expect(url).toContain(`X-Plex-Token=${token}`);
    });
  });

  describe('getOptimizedImageUrl', () => {
    it('should return thumbnail size URL', () => {
      const url = getOptimizedImageUrl(serverUrl, imagePath, token, 'thumbnail');

      expect(url).toContain('width=150');
      expect(url).toContain('height=150');
    });

    it('should return small size URL', () => {
      const url = getOptimizedImageUrl(serverUrl, imagePath, token, 'small');

      expect(url).toContain('width=300');
      expect(url).toContain('height=300');
    });

    it('should return medium size URL', () => {
      const url = getOptimizedImageUrl(serverUrl, imagePath, token, 'medium');

      expect(url).toContain('width=600');
      expect(url).toContain('height=600');
    });

    it('should return large size URL', () => {
      const url = getOptimizedImageUrl(serverUrl, imagePath, token, 'large');

      expect(url).toContain('width=1200');
      expect(url).toContain('height=1200');
    });

    it('should return original URL without transcoding', () => {
      const url = getOptimizedImageUrl(serverUrl, imagePath, token, 'original');

      expect(url).toBe(`${serverUrl}${imagePath}?X-Plex-Token=${token}`);
      expect(url).not.toContain('/photo/:/transcode');
    });
  });

  describe('getCompositeImageUrl', () => {
    it('should generate composite image URL', () => {
      const compositePath = '/playlists/123/composite';
      const url = getCompositeImageUrl(serverUrl, compositePath, token);

      expect(url).toBe(`${serverUrl}${compositePath}?X-Plex-Token=${token}`);
    });
  });

  describe('preloadImage', () => {
    it('should preload image successfully', async () => {
      // Mock Image constructor
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as ((error: Error) => void) | null,
        src: '',
      };

      global.Image = vi.fn(() => mockImage) as any;

      const url = 'http://example.com/image.jpg';
      const promise = preloadImage(url);

      // Simulate successful load
      mockImage.onload?.();

      await expect(promise).resolves.toBeUndefined();
      expect(mockImage.src).toBe(url);
    });

    it('should reject on image load error', async () => {
      // Mock Image constructor
      const mockImage = {
        onload: null as (() => void) | null,
        onerror: null as ((error: Error) => void) | null,
        src: '',
      };

      global.Image = vi.fn(() => mockImage) as any;

      const url = 'http://example.com/image.jpg';
      const promise = preloadImage(url);

      // Simulate error
      mockImage.onerror?.();

      await expect(promise).rejects.toThrow(`Failed to load image: ${url}`);
    });
  });

  describe('preloadImages', () => {
    it('should preload multiple images', async () => {
      // Mock Image constructor
      const mockImages: any[] = [];
      global.Image = vi.fn(() => {
        const mockImage = {
          onload: null as (() => void) | null,
          onerror: null as ((error: Error) => void) | null,
          src: '',
        };
        mockImages.push(mockImage);
        return mockImage;
      }) as any;

      const urls = [
        'http://example.com/image1.jpg',
        'http://example.com/image2.jpg',
        'http://example.com/image3.jpg',
      ];

      const promise = preloadImages(urls);

      // Simulate all images loading
      mockImages.forEach(img => img.onload?.());

      await expect(promise).resolves.toBeUndefined();
      expect(mockImages).toHaveLength(3);
    });
  });

  describe('getResponsiveSrcSet', () => {
    it('should generate srcset with default widths', () => {
      const srcset = getResponsiveSrcSet(serverUrl, imagePath, token);

      expect(srcset).toContain('300w');
      expect(srcset).toContain('600w');
      expect(srcset).toContain('900w');
      expect(srcset).toContain('1200w');
      expect(srcset.split(',').length).toBe(4);
    });

    it('should generate srcset with custom widths', () => {
      const srcset = getResponsiveSrcSet(serverUrl, imagePath, token, [400, 800]);

      expect(srcset).toContain('400w');
      expect(srcset).toContain('800w');
      expect(srcset.split(',').length).toBe(2);
    });

    it('should include transcoded URLs in srcset', () => {
      const srcset = getResponsiveSrcSet(serverUrl, imagePath, token, [300]);

      expect(srcset).toContain('/photo/:/transcode');
      expect(srcset).toContain('width=300');
      expect(srcset).toContain('300w');
    });
  });

  describe('calculateOptimalDimensions', () => {
    it('should maintain aspect ratio when width is limiting', () => {
      const result = calculateOptimalDimensions(1600, 900, 800, 600);

      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
    });

    it('should maintain aspect ratio when height is limiting', () => {
      const result = calculateOptimalDimensions(900, 1600, 800, 600);

      expect(result.width).toBe(338);
      expect(result.height).toBe(600);
    });

    it('should handle square images', () => {
      const result = calculateOptimalDimensions(1000, 1000, 500, 500);

      expect(result.width).toBe(500);
      expect(result.height).toBe(500);
    });

    it('should handle portrait images', () => {
      const result = calculateOptimalDimensions(600, 900, 400, 600);

      expect(result.width).toBe(400);
      expect(result.height).toBe(600);
    });

    it('should handle landscape images', () => {
      const result = calculateOptimalDimensions(1920, 1080, 800, 600);

      expect(result.width).toBe(800);
      expect(result.height).toBe(450);
    });
  });
});
