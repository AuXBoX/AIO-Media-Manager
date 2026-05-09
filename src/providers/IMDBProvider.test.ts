import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { IMDBProvider } from './IMDBProvider';
import { PlexClient } from '@/api/plexClient';

vi.mock('axios');

describe('IMDBProvider', () => {
  let provider: IMDBProvider;
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

    provider = new IMDBProvider(mockPlexClient, { apiKey: 'test-api-key' });
  });

  describe('search', () => {
    it('should search for movies', async () => {
      const mockResponse = {
        data: {
          Search: [
            {
              Title: 'The Shawshank Redemption',
              Year: '1994',
              imdbID: 'tt0111161',
              Type: 'movie',
              Poster: 'https://example.com/poster.jpg',
            },
          ],
          Response: 'True',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const results = await provider.search('Shawshank', 'movie');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          s: 'Shawshank',
          type: 'movie',
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        externalId: 'tt0111161',
        title: 'The Shawshank Redemption',
        year: 1994,
        provider: 'imdb',
      });
    });

    it('should search for TV shows', async () => {
      const mockResponse = {
        data: {
          Search: [
            {
              Title: 'Game of Thrones',
              Year: '2011-2019',
              imdbID: 'tt0944947',
              Type: 'series',
              Poster: 'https://example.com/poster.jpg',
            },
          ],
          Response: 'True',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const results = await provider.search('Game of Thrones', 'show');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          s: 'Game of Thrones',
          type: 'series',
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        externalId: 'tt0944947',
        title: 'Game of Thrones',
        provider: 'imdb',
      });
    });

    it('should include year in search params', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { Search: [], Response: 'True' },
      });

      await provider.search('Inception', 'movie', 2010);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          s: 'Inception',
          type: 'movie',
          y: 2010,
        },
      });
    });

    it('should return empty array when no results found', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          Response: 'False',
          Error: 'Movie not found!',
        },
      });

      const results = await provider.search('NonExistent', 'movie');

      expect(results).toEqual([]);
    });

    it('should throw error for unsupported media types', async () => {
      await expect(provider.search('Test', 'artist' as any)).rejects.toThrow(
        'IMDB provider does not support media type: artist'
      );
    });
  });

  describe('getDetails', () => {
    it('should get movie details', async () => {
      const mockResponse = {
        data: {
          Title: 'The Shawshank Redemption',
          Year: '1994',
          Rated: 'R',
          Released: '14 Oct 1994',
          Runtime: '142 min',
          Genre: 'Drama',
          Director: 'Frank Darabont',
          Writer: 'Stephen King, Frank Darabont',
          Actors: 'Tim Robbins, Morgan Freeman, Bob Gunton',
          Plot: 'Two imprisoned men bond over a number of years...',
          Language: 'English',
          Country: 'United States',
          Awards: 'Nominated for 7 Oscars',
          Poster: 'https://example.com/poster.jpg',
          Ratings: [
            { Source: 'Internet Movie Database', Value: '9.3/10' },
          ],
          Metascore: '80',
          imdbRating: '9.3',
          imdbVotes: '2,500,000',
          imdbID: 'tt0111161',
          Type: 'movie',
          Response: 'True',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const details = await provider.getDetails('tt0111161');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          i: 'tt0111161',
          plot: 'full',
        },
      });

      expect(details).toMatchObject({
        externalId: 'tt0111161',
        title: 'The Shawshank Redemption',
        year: 1994,
        runtime: 142,
        rating: 9.3,
        provider: 'imdb',
      });

      expect(details.genres).toEqual(['Drama']);
      expect(details.cast).toHaveLength(3);
      expect(details.cast![0]).toMatchObject({
        name: 'Tim Robbins',
        character: '',
        order: 0,
      });

      expect(details.crew).toBeDefined();
      const directors = details.crew!.filter((c) => c.job === 'Director');
      expect(directors).toHaveLength(1);
      expect(directors[0].name).toBe('Frank Darabont');
    });

    it('should handle N/A values', async () => {
      const mockResponse = {
        data: {
          Title: 'Test Movie',
          Year: '2020',
          Runtime: 'N/A',
          Genre: 'N/A',
          Director: 'N/A',
          Writer: 'N/A',
          Actors: 'N/A',
          Plot: 'N/A',
          Poster: 'N/A',
          imdbRating: 'N/A',
          imdbID: 'tt1234567',
          Type: 'movie',
          Response: 'True',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const details = await provider.getDetails('tt1234567');

      expect(details.runtime).toBeUndefined();
      expect(details.genres).toBeUndefined();
      expect(details.rating).toBeUndefined();
      expect(details.cast).toBeUndefined();
      expect(details.posters).toBeUndefined();
    });

    it('should throw error when API returns error', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          Response: 'False',
          Error: 'Incorrect IMDb ID.',
        },
      });

      await expect(provider.getDetails('invalid')).rejects.toThrow(
        'Incorrect IMDb ID.'
      );
    });
  });

  describe('importMetadata', () => {
    it('should import metadata to Plex', async () => {
      const mockDetails = {
        data: {
          Title: 'The Shawshank Redemption',
          Year: '1994',
          Runtime: '142 min',
          Genre: 'Drama',
          Director: 'Frank Darabont',
          Writer: 'Stephen King',
          Actors: 'Tim Robbins, Morgan Freeman',
          Plot: 'Two imprisoned men bond...',
          imdbRating: '9.3',
          imdbID: 'tt0111161',
          Poster: 'https://example.com/poster.jpg',
          Type: 'movie',
          Response: 'True',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockDetails);

      await provider.importMetadata('12345', 'tt0111161');

      expect(mockPlexClient.put).toHaveBeenCalledWith(
        '/library/metadata/12345',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            title: 'The Shawshank Redemption',
            summary: 'Two imprisoned men bond...',
            rating: 9.3,
            year: 1994,
          }),
        })
      );
    });
  });
});
