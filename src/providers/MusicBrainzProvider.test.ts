import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { MusicBrainzProvider } from './MusicBrainzProvider';
import { PlexClient } from '@/api/plexClient';

vi.mock('axios');

describe('MusicBrainzProvider', () => {
  let provider: MusicBrainzProvider;
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

    provider = new MusicBrainzProvider(mockPlexClient);
  });

  describe('search', () => {
    it('should search for artists', async () => {
      const mockResponse = {
        data: {
          artists: [
            {
              id: '5b11f4ce-a62d-471e-81fc-a69a8278c7da',
              name: 'Nirvana',
              'sort-name': 'Nirvana',
              disambiguation: 'US grunge band',
              type: 'Group',
              country: 'US',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const results = await provider.search('Nirvana', 'artist');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/artist', {
        params: {
          query: 'Nirvana',
          fmt: 'json',
          limit: 25,
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        externalId: 'artist-5b11f4ce-a62d-471e-81fc-a69a8278c7da',
        title: 'Nirvana',
        originalTitle: 'Nirvana',
        summary: 'US grunge band',
        provider: 'musicbrainz',
      });
    });

    it('should search for albums', async () => {
      const mockResponse = {
        data: {
          releases: [
            {
              id: '1b022e01-4da6-387b-8658-8678046e4cef',
              title: 'Nevermind',
              date: '1991-09-24',
              'artist-credit': [
                {
                  name: 'Nirvana',
                  artist: {
                    id: '5b11f4ce-a62d-471e-81fc-a69a8278c7da',
                    name: 'Nirvana',
                  },
                },
              ],
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const results = await provider.search('Nevermind', 'album');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/release', {
        params: {
          query: 'Nevermind',
          fmt: 'json',
          limit: 25,
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        externalId: 'release-1b022e01-4da6-387b-8658-8678046e4cef',
        title: 'Nevermind',
        year: 1991,
        summary: 'Nirvana',
        provider: 'musicbrainz',
      });
    });

    it('should search for albums with year filter', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { releases: [] } });

      await provider.search('Nevermind', 'album', 1991);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/release', {
        params: {
          query: 'Nevermind AND date:1991',
          fmt: 'json',
          limit: 25,
        },
      });
    });

    it('should search for tracks', async () => {
      const mockResponse = {
        data: {
          recordings: [
            {
              id: 'c0beb80b-4185-4328-8761-b9e45a5d0ac6',
              title: 'Smells Like Teen Spirit',
              length: 301920,
              'artist-credit': [
                {
                  name: 'Nirvana',
                  artist: {
                    id: '5b11f4ce-a62d-471e-81fc-a69a8278c7da',
                    name: 'Nirvana',
                  },
                },
              ],
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const results = await provider.search('Smells Like Teen Spirit', 'track');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/recording', {
        params: {
          query: 'Smells Like Teen Spirit',
          fmt: 'json',
          limit: 25,
        },
      });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        externalId: 'recording-c0beb80b-4185-4328-8761-b9e45a5d0ac6',
        title: 'Smells Like Teen Spirit',
        summary: 'Nirvana',
        provider: 'musicbrainz',
      });
    });

    it('should throw error for unsupported media types', async () => {
      await expect(provider.search('Test', 'movie' as any)).rejects.toThrow(
        'MusicBrainz does not support media type: movie'
      );
    });
  });

  describe('getDetails', () => {
    it('should get artist details', async () => {
      const mockResponse = {
        data: {
          id: '5b11f4ce-a62d-471e-81fc-a69a8278c7da',
          name: 'Nirvana',
          'sort-name': 'Nirvana',
          disambiguation: 'US grunge band',
          type: 'Group',
          tags: [
            { name: 'grunge', count: 10 },
            { name: 'rock', count: 8 },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const details = await provider.getDetails(
        'artist-5b11f4ce-a62d-471e-81fc-a69a8278c7da'
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/artist/5b11f4ce-a62d-471e-81fc-a69a8278c7da',
        {
          params: {
            inc: 'tags',
            fmt: 'json',
          },
        }
      );

      expect(details).toMatchObject({
        externalId: 'artist-5b11f4ce-a62d-471e-81fc-a69a8278c7da',
        title: 'Nirvana',
        originalTitle: 'Nirvana',
        summary: 'US grunge band',
        genres: ['grunge', 'rock'],
        provider: 'musicbrainz',
      });
    });

    it('should get release details', async () => {
      const mockResponse = {
        data: {
          id: '1b022e01-4da6-387b-8658-8678046e4cef',
          title: 'Nevermind',
          date: '1991-09-24',
          'release-group': {
            id: '1b022e01-4da6-387b-8658-8678046e4cef',
            'primary-type': 'Album',
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const details = await provider.getDetails(
        'release-1b022e01-4da6-387b-8658-8678046e4cef'
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/release/1b022e01-4da6-387b-8658-8678046e4cef',
        {
          params: {
            inc: 'artist-credits+recordings',
            fmt: 'json',
          },
        }
      );

      expect(details).toMatchObject({
        externalId: 'release-1b022e01-4da6-387b-8658-8678046e4cef',
        title: 'Nevermind',
        year: 1991,
        releaseDate: '1991-09-24',
        genres: ['Album'],
        provider: 'musicbrainz',
      });
    });

    it('should get recording details', async () => {
      const mockResponse = {
        data: {
          id: 'c0beb80b-4185-4328-8761-b9e45a5d0ac6',
          title: 'Smells Like Teen Spirit',
          length: 301920,
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const details = await provider.getDetails(
        'recording-c0beb80b-4185-4328-8761-b9e45a5d0ac6'
      );

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/recording/c0beb80b-4185-4328-8761-b9e45a5d0ac6',
        {
          params: {
            inc: 'artist-credits+releases',
            fmt: 'json',
          },
        }
      );

      expect(details).toMatchObject({
        externalId: 'recording-c0beb80b-4185-4328-8761-b9e45a5d0ac6',
        title: 'Smells Like Teen Spirit',
        runtime: 301,
        provider: 'musicbrainz',
      });
    });

    it('should throw error for invalid external ID format', async () => {
      await expect(provider.getDetails('invalid-id')).rejects.toThrow(
        'Invalid MusicBrainz external ID format'
      );
    });
  });

  describe('importMetadata', () => {
    it('should import artist metadata to Plex', async () => {
      const mockDetails = {
        data: {
          id: '5b11f4ce-a62d-471e-81fc-a69a8278c7da',
          name: 'Nirvana',
          'sort-name': 'Nirvana',
          disambiguation: 'US grunge band',
          tags: [{ name: 'grunge', count: 10 }],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockDetails);

      await provider.importMetadata(
        '12345',
        'artist-5b11f4ce-a62d-471e-81fc-a69a8278c7da'
      );

      expect(mockPlexClient.put).toHaveBeenCalledWith(
        '/library/metadata/12345',
        null,
        expect.objectContaining({
          params: expect.objectContaining({
            title: 'Nirvana',
            summary: 'US grunge band',
          }),
        })
      );
    });
  });
});
