import { describe, it, expect } from 'vitest';
import {
  generateResponsiveImageUrls,
  getOptimalImageSize,
  generateSrcSet,
  generateSizes,
  getLowQualityPlaceholder,
} from './responsiveImages';

describe('responsiveImages', () => {
  const baseUrl = 'http://localhost:32400';
  const thumbPath = '/library/metadata/123/thumb';
  const token = 'test-token';

  describe('generateResponsiveImageUrls', () => {
    it('should generate URLs for all sizes', () => {
      const urls = generateResponsiveImageUrls(baseUrl, thumbPath, token);

      expect(urls).toHaveProperty('sm');
      expect(urls).toHaveProperty('md');
      expect(urls).toHaveProperty('lg');
      expect(urls).toHaveProperty('xl');
      expect(urls).toHaveProperty('original');
    });

    it('should include correct parameters', () => {
      const urls = generateResponsiveImageUrls(baseUrl, thumbPath, token);

      expect(urls.sm).toContain('width=400');
      expect(urls.sm).toContain('height=600');
      expect(urls.sm).toContain('X-Plex-Token=test-token');
    });

    it('should encode thumb path', () => {
      const urls = generateResponsiveImageUrls(baseUrl, thumbPath, token);

      expect(urls.sm).toContain(encodeURIComponent(thumbPath));
    });
  });

  describe('getOptimalImageSize', () => {
    it('should return sm for mobile screens', () => {
      expect(getOptimalImageSize(375)).toBe('sm');
      expect(getOptimalImageSize(639)).toBe('sm');
    });

    it('should return md for small tablets', () => {
      expect(getOptimalImageSize(640)).toBe('md');
      expect(getOptimalImageSize(767)).toBe('md');
    });

    it('should return lg for tablets', () => {
      expect(getOptimalImageSize(768)).toBe('lg');
      expect(getOptimalImageSize(1023)).toBe('lg');
    });

    it('should return xl for desktops', () => {
      expect(getOptimalImageSize(1024)).toBe('xl');
      expect(getOptimalImageSize(1920)).toBe('xl');
    });
  });

  describe('generateSrcSet', () => {
    it('should generate valid srcSet string', () => {
      const urls = generateResponsiveImageUrls(baseUrl, thumbPath, token);
      const srcSet = generateSrcSet(urls);

      expect(srcSet).toContain('400w');
      expect(srcSet).toContain('600w');
      expect(srcSet).toContain('800w');
      expect(srcSet).toContain('1200w');
    });

    it('should separate entries with commas', () => {
      const urls = generateResponsiveImageUrls(baseUrl, thumbPath, token);
      const srcSet = generateSrcSet(urls);

      const entries = srcSet.split(', ');
      expect(entries).toHaveLength(4);
    });
  });

  describe('generateSizes', () => {
    it('should generate default sizes', () => {
      const sizes = generateSizes();

      expect(sizes).toContain('(max-width: 640px) 100vw');
      expect(sizes).toContain('(max-width: 768px) 50vw');
      expect(sizes).toContain('33vw');
    });

    it('should use custom sizes', () => {
      const sizes = generateSizes({
        mobile: '90vw',
        tablet: '45vw',
        desktop: '30vw',
      });

      expect(sizes).toContain('90vw');
      expect(sizes).toContain('45vw');
      expect(sizes).toContain('30vw');
    });
  });

  describe('getLowQualityPlaceholder', () => {
    it('should generate low quality URL', () => {
      const url = getLowQualityPlaceholder(baseUrl, thumbPath, token);

      expect(url).toContain('width=50');
      expect(url).toContain('height=75');
      expect(url).toContain('blur=20');
    });
  });
});
