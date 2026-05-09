import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { TMDBProvider } from './TMDBProvider';
import { PlexClient } from '@/api/plexClient';

vi.mock('axios');

describe('TMDBProvider', () => {
  let provider: TMDBProvider;
  let mockPlexClient: PlexClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
    };

    (axios.create as any) = vi.fn(() => mockAxiosInstance);

    mockPlexClient = {
      put: vi.fn(),
    } as any;

    provider = new TMDBProvider(mockPlexClient, { apiKey: 'test-api-key' });
  });

  describe('search', () => {
    it('should search for movies', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 550,
              title: 'Fight Club',
              original_title: 'Fight Club',
              release_date: '1999-10-15',
              overview: 'A ticking-time-bomb insomniac...',
              poster_path: '/poster.jpg',
              vote_average: 8.4,
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const results = await provider.search('Fight Club', 'movie');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search/movie', {
        params: {
          query: 'Fight Club',
          include_adult: false,
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        externalId: 'movie-550',
        title: 'Fight Club',
        year: 1999,
        provider: 'tmdb',
      });
    });

    it('should search for TV shows', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 1396,
              name: 'Breaking Bad',
              original_name: 'Breaking Bad',
              first_air_date: '2008-01-20',
              overview: 'A high school chemistry teacher...',
              poster_path: '/poster.jpg',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const results = await provider.search('Breaking Bad', 'show');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search/tv', {
        params: {
          query: 'Breaking Bad',
          include_adult: false,
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        externalId: 'tv-1396',
        title: 'Breaking Bad',
        year: 2008,
        provider: 'tmdb',
      });
    });

    it('should include year in search params', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { results: [] } });

      await provider.search('Inception', 'movie', 2010);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search/movie', {
        params: {
          query: 'Inception',
          include_adult: false,
          year: 2010,
        },
      });
    });

    it('should throw error for unsupported media types', async () => {
      await expect(provider.search('Test', 'artist' as any)).rejects.toThrow(
        'TMDB does not support media type: artist'
      );
    });
  });

  describe('getDetails', () => {
    it('should get movie details', async () => {
      const mockResponse = {
        data: {
          id: 550,
          title: 'Fight Club',
          original_title: 'Fight Club',
          overview: 'A ticking-time-bomb insomniac...',
          tagline: 'Mischief. Mayhem. Soap.',
          vote_average: 8.4,
          release_date: '1999-10-15',
          runtime: 139,
          genres: [{ id: 18, name: 'Drama' }],
          poster_path: '/poster.jpg',
          backdrop_path: '/backdrop.jpg',
          credits: {
            cast: [
              {
                name: 'Brad Pitt',
                character: 'Tyler Durden',
                profile_path: '/brad.jpg',
                order: 0,
              },
            ],
            crew: [
              {
                name: 'David Fincher',
                job: 'Director',
                department: 'Directing',
                profile_path: '/fincher.jpg',
              },
            ],
          },
          images: {
            posters: [{ file_path: '/poster1.jpg' }],
            backdrops: [{ file_path: '/backdrop1.jpg' }],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const details = await provider.getDetails('movie-550');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/movie/550', {
        params: {
          append_to_response: 'credits,images',
        },
      });

      expect(details).toMatchObject({
        externalId: 'movie-550',
        title: 'Fight Club',
        year: 1999,
        runtime: 139,
        provider: 'tmdb',
      });

      expect(details.cast).toHaveLength(1);
      expect(details.cast![0]).toMatchObject({
        name: 'Brad Pitt',
        character: 'Tyler Durden',
      });

      expect(details.crew).toHaveLength(1);
      expect(details.crew![0]).toMatchObject({
        name: 'David Fincher',
        job: 'Director',
      });
    });

    it('should get TV show details', async () => {
      const mockResponse = {
        data: {
          id: 1396,
          name: 'Breaking Bad',
          original_name: 'Breaking Bad',
          overview: 'A high school chemistry teacher...',
          vote_average: 9.5,
          first_air_date: '2008-01-20',
          episode_run_time: [45],
          genres: [{ id: 18, name: 'Drama' }],
          credits: {
            cast: [],
            crew: [],
          },
          images: {
            posters: [],
            backdrops: [],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const details = await provider.getDetails('tv-1396');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tv/1396', {
        params: {
          append_to_response: 'credits,images',
        },
      });

      expect(details).toMatchObject({
        externalId: 'tv-1396',
        title: 'Breaking Bad',
        year: 2008,
        runtime: 45,
        provider: 'tmdb',
      });
    });

    it('should throw error for invalid external ID format', async () => {
      await expect(provider.getDetails('invalid-id')).rejects.toThrow(
        'Invalid TMDB external ID format'
      );
    });
  });

  describe('importMetadata', () => {
    it('should import metadata to Plex', async () => {
      const mockDetails = {
        data: {
          id: 550,
          title: 'Fight Club',
          overview: 'A ticking-time-bomb insomniac...',
          tagline: 'Mischief. Mayhem. Soap.',
          vote_average: 8.4,
          release_date: '1999-10-15',
          runtime: 139,
          genres: [{ id: 18, name: 'Drama' }],
          credits: {
            cast: [
              {
                name: 'Brad Pitt',
                character: 'Tyler Durden',
                order: 0,
              },
            ],
            crew: [
              {
                name: 'David Fincher',
                job: 'Director',
                department: 'Directing',
              },
            ],
          },
          images: {
            posters: [],
            backdrops: [],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockDetails);

      await provider.importMetadata('12345', 'movie-550');

      expect(mockPlexClient.put).toHaveBeenCalledWith(
        '/library/metadata/12345',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            title: 'Fight Club',
            summary: 'A ticking-time-bomb insomniac...',
            tagline: 'Mischief. Mayhem. Soap.',
            rating: 8.4,
            year: 1999,
          }),
        })
      );
    });
  });
});
