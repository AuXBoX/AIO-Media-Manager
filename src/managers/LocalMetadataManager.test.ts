import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalMetadataManager, NfoMetadata, EmbeddedMetadata } from './LocalMetadataManager';
import { MetadataItem } from './MetadataManager';

// Mock window.electron
const mockElectron = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  copyFile: vi.fn(),
  getFileStats: vi.fn(),
  checkAccess: vi.fn(),
  readEmbeddedMetadata: vi.fn(),
  writeEmbeddedMetadata: vi.fn(),
};

describe('LocalMetadataManager', () => {
  let manager: LocalMetadataManager;

  beforeEach(() => {
    // Setup window.electron mock
    (global as any).window = {
      electron: mockElectron,
    };

    manager = new LocalMetadataManager();

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup
    delete (global as any).window;
  });

  describe('NFO File Operations', () => {
    describe('readNfoFile', () => {
      it('should read and parse a movie NFO file', async () => {
        const nfoXml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <title>The Matrix</title>
  <originaltitle>The Matrix</originaltitle>
  <year>1999</year>
  <plot>A computer hacker learns about the true nature of reality.</plot>
  <tagline>Welcome to the Real World</tagline>
  <rating>8.7</rating>
  <mpaa>R</mpaa>
  <genre>Action</genre>
  <genre>Sci-Fi</genre>
  <director>Lana Wachowski</director>
  <director>Lilly Wachowski</director>
  <studio>Warner Bros.</studio>
</movie>`;

        mockElectron.readFile.mockResolvedValue(nfoXml);

        const result = await manager.readNfoFile('/path/to/movie.nfo');

        expect(result).toBeDefined();
        expect(result?.title).toBe('The Matrix');
        expect(result?.year).toBe(1999);
        expect(result?.plot).toBe('A computer hacker learns about the true nature of reality.');
        expect(result?.rating).toBe(8.7);
        expect(result?.genre).toEqual(['Action', 'Sci-Fi']);
        expect(result?.director).toEqual(['Lana Wachowski', 'Lilly Wachowski']);
      });

      it('should read and parse a TV episode NFO file', async () => {
        const nfoXml = `<?xml version="1.0" encoding="UTF-8"?>
<episodedetails>
  <title>Pilot</title>
  <showtitle>Breaking Bad</showtitle>
  <season>1</season>
  <episode>1</episode>
  <plot>A high school chemistry teacher turned meth cook.</plot>
  <aired>2008-01-20</aired>
  <rating>9.0</rating>
</episodedetails>`;

        mockElectron.readFile.mockResolvedValue(nfoXml);

        const result = await manager.readNfoFile('/path/to/episode.nfo');

        expect(result).toBeDefined();
        expect(result?.title).toBe('Pilot');
        expect(result?.showtitle).toBe('Breaking Bad');
        expect(result?.season).toBe(1);
        expect(result?.episode).toBe(1);
        expect(result?.aired).toBe('2008-01-20');
      });

      it('should return null if file does not exist', async () => {
        mockElectron.readFile.mockRejectedValue(new Error('File not found'));

        const result = await manager.readNfoFile('/path/to/nonexistent.nfo');

        expect(result).toBeNull();
      });

      it('should handle actors with roles', async () => {
        const nfoXml = `<?xml version="1.0" encoding="UTF-8"?>
<movie>
  <title>Test Movie</title>
  <actor>
    <name>Keanu Reeves</name>
    <role>Neo</role>
    <thumb>http://example.com/keanu.jpg</thumb>
  </actor>
  <actor>
    <name>Laurence Fishburne</name>
    <role>Morpheus</role>
  </actor>
</movie>`;

        mockElectron.readFile.mockResolvedValue(nfoXml);

        const result = await manager.readNfoFile('/path/to/movie.nfo');

        expect(result?.actor).toHaveLength(2);
        expect(result?.actor?.[0]).toEqual({
          name: 'Keanu Reeves',
          role: 'Neo',
          thumb: 'http://example.com/keanu.jpg',
        });
        expect(result?.actor?.[1]).toEqual({
          name: 'Laurence Fishburne',
          role: 'Morpheus',
          thumb: undefined,
        });
      });
    });

    describe('writeNfoFile', () => {
      it('should write movie metadata to NFO file', async () => {
        const metadata: NfoMetadata = {
          title: 'The Matrix',
          originalTitle: 'The Matrix',
          year: 1999,
          plot: 'A computer hacker learns about the true nature of reality.',
          tagline: 'Welcome to the Real World',
          rating: 8.7,
          mpaa: 'R',
          genre: ['Action', 'Sci-Fi'],
          director: ['Lana Wachowski', 'Lilly Wachowski'],
          studio: 'Warner Bros.',
        };

        mockElectron.writeFile.mockResolvedValue(true);

        await manager.writeNfoFile('/path/to/movie.nfo', metadata);

        expect(mockElectron.writeFile).toHaveBeenCalledOnce();
        const [filePath, content] = mockElectron.writeFile.mock.calls[0];
        expect(filePath).toBe('/path/to/movie.nfo');
        expect(content).toContain('<movie>');
        expect(content).toContain('<title>The Matrix</title>');
        expect(content).toContain('<year>1999</year>');
      });

      it('should write TV episode metadata to NFO file', async () => {
        const metadata: NfoMetadata = {
          title: 'Pilot',
          showtitle: 'Breaking Bad',
          season: 1,
          episode: 1,
          plot: 'A high school chemistry teacher turned meth cook.',
          aired: '2008-01-20',
        };

        mockElectron.writeFile.mockResolvedValue(true);

        await manager.writeNfoFile('/path/to/episode.nfo', metadata);

        expect(mockElectron.writeFile).toHaveBeenCalledOnce();
        const [, content] = mockElectron.writeFile.mock.calls[0];
        expect(content).toContain('<episodedetails>');
        expect(content).toContain('<showtitle>Breaking Bad</showtitle>');
        expect(content).toContain('<season>1</season>');
        expect(content).toContain('<episode>1</episode>');
      });
    });

    describe('deleteNfoFile', () => {
      it('should delete NFO file', async () => {
        mockElectron.deleteFile.mockResolvedValue(true);

        await manager.deleteNfoFile('/path/to/movie.nfo');

        expect(mockElectron.deleteFile).toHaveBeenCalledWith('/path/to/movie.nfo');
      });
    });

    describe('backupNfoFile', () => {
      it('should create backup of NFO file', async () => {
        mockElectron.copyFile.mockResolvedValue(true);

        const backupPath = await manager.backupNfoFile('/path/to/movie.nfo');

        expect(mockElectron.copyFile).toHaveBeenCalledOnce();
        expect(backupPath).toMatch(/\.nfo\.bak$/);
      });
    });
  });

  describe('Embedded Metadata Operations', () => {
    describe('readEmbeddedMetadata', () => {
      it('should read embedded metadata from MP3 file', async () => {
        const mockMetadata: EmbeddedMetadata = {
          title: 'Bohemian Rhapsody',
          artist: 'Queen',
          album: 'A Night at the Opera',
          year: 1975,
          genre: ['Rock'],
          trackNumber: 11,
          albumArtist: 'Queen',
          composer: 'Freddie Mercury',
        };

        mockElectron.readEmbeddedMetadata.mockResolvedValue(mockMetadata);

        const result = await manager.readEmbeddedMetadata('/path/to/song.mp3');

        expect(result).toEqual(mockMetadata);
        expect(mockElectron.readEmbeddedMetadata).toHaveBeenCalledWith('/path/to/song.mp3');
      });

      it('should read embedded metadata from MP4 file', async () => {
        const mockMetadata: EmbeddedMetadata = {
          title: 'The Matrix',
          description: 'A computer hacker learns about the true nature of reality.',
          year: 1999,
          genre: ['Action', 'Sci-Fi'],
          director: 'Lana Wachowski',
          cast: ['Keanu Reeves', 'Laurence Fishburne'],
        };

        mockElectron.readEmbeddedMetadata.mockResolvedValue(mockMetadata);

        const result = await manager.readEmbeddedMetadata('/path/to/movie.mp4');

        expect(result).toEqual(mockMetadata);
      });

      it('should return null if reading fails', async () => {
        mockElectron.readEmbeddedMetadata.mockRejectedValue(new Error('Read failed'));

        const result = await manager.readEmbeddedMetadata('/path/to/file.mp3');

        expect(result).toBeNull();
      });
    });

    describe('writeEmbeddedMetadata', () => {
      it('should write embedded metadata to MP3 file', async () => {
        const metadata: EmbeddedMetadata = {
          title: 'Bohemian Rhapsody',
          artist: 'Queen',
          album: 'A Night at the Opera',
          year: 1975,
          genre: ['Rock'],
          trackNumber: 11,
        };

        mockElectron.writeEmbeddedMetadata.mockResolvedValue(true);

        await manager.writeEmbeddedMetadata('/path/to/song.mp3', metadata);

        expect(mockElectron.writeEmbeddedMetadata).toHaveBeenCalledWith(
          '/path/to/song.mp3',
          metadata
        );
      });

      it('should write embedded metadata to MP4 file', async () => {
        const metadata: EmbeddedMetadata = {
          title: 'The Matrix',
          description: 'A computer hacker learns about the true nature of reality.',
          year: 1999,
          genre: ['Action', 'Sci-Fi'],
        };

        mockElectron.writeEmbeddedMetadata.mockResolvedValue(true);

        await manager.writeEmbeddedMetadata('/path/to/movie.mp4', metadata);

        expect(mockElectron.writeEmbeddedMetadata).toHaveBeenCalledWith(
          '/path/to/movie.mp4',
          metadata
        );
      });

      it('should throw error if writing fails', async () => {
        mockElectron.writeEmbeddedMetadata.mockRejectedValue(new Error('Write failed'));

        await expect(
          manager.writeEmbeddedMetadata('/path/to/file.mp3', { title: 'Test' })
        ).rejects.toThrow('Write failed');
      });
    });
  });

  describe('Plex to Embedded Conversion', () => {
    it('should convert Plex track metadata to embedded format', () => {
      const plexItem: MetadataItem = {
        ratingKey: '123',
        key: '/library/metadata/123',
        guid: 'plex://track/123',
        type: 'track',
        title: 'Bohemian Rhapsody',
        parentTitle: 'A Night at the Opera',
        grandparentTitle: 'Queen',
        year: 1975,
        index: 11,
        summary: 'Epic rock ballad',
        genres: [{ tag: 'Rock' }, { tag: 'Progressive Rock' }],
        writers: [{ tag: 'Freddie Mercury' }],
        addedAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Access private method via type assertion
      const embedded = (manager as any).plexToEmbedded(plexItem);

      expect(embedded.title).toBe('Bohemian Rhapsody');
      expect(embedded.artist).toBe('Queen');
      expect(embedded.album).toBe('A Night at the Opera');
      expect(embedded.trackNumber).toBe(11);
      expect(embedded.year).toBe(1975);
      expect(embedded.genre).toEqual(['Rock', 'Progressive Rock']);
      expect(embedded.composer).toBe('Freddie Mercury');
      expect(embedded.albumArtist).toBe('Queen');
    });

    it('should convert Plex movie metadata to embedded format', () => {
      const plexItem: MetadataItem = {
        ratingKey: '456',
        key: '/library/metadata/456',
        guid: 'plex://movie/456',
        type: 'movie',
        title: 'The Matrix',
        year: 1999,
        summary: 'A computer hacker learns about the true nature of reality.',
        genres: [{ tag: 'Action' }, { tag: 'Sci-Fi' }],
        directors: [{ tag: 'Lana Wachowski' }, { tag: 'Lilly Wachowski' }],
        roles: [
          { tag: 'Keanu Reeves', role: 'Neo' },
          { tag: 'Laurence Fishburne', role: 'Morpheus' },
        ],
        addedAt: Date.now(),
        updatedAt: Date.now(),
      };

      const embedded = (manager as any).plexToEmbedded(plexItem);

      expect(embedded.title).toBe('The Matrix');
      expect(embedded.year).toBe(1999);
      expect(embedded.description).toBe(
        'A computer hacker learns about the true nature of reality.'
      );
      expect(embedded.genre).toEqual(['Action', 'Sci-Fi']);
      expect(embedded.director).toBe('Lana Wachowski');
      expect(embedded.cast).toEqual(['Keanu Reeves', 'Laurence Fishburne']);
    });

    it('should convert Plex album metadata to embedded format', () => {
      const plexItem: MetadataItem = {
        ratingKey: '789',
        key: '/library/metadata/789',
        guid: 'plex://album/789',
        type: 'album',
        title: 'A Night at the Opera',
        parentTitle: 'Queen',
        year: 1975,
        summary: 'Fourth studio album by Queen',
        genres: [{ tag: 'Rock' }],
        addedAt: Date.now(),
        updatedAt: Date.now(),
      };

      const embedded = (manager as any).plexToEmbedded(plexItem);

      expect(embedded.album).toBe('A Night at the Opera');
      expect(embedded.artist).toBe('Queen');
      expect(embedded.albumArtist).toBe('Queen');
      expect(embedded.year).toBe(1975);
    });

    it('should handle missing optional fields', () => {
      const plexItem: MetadataItem = {
        ratingKey: '999',
        key: '/library/metadata/999',
        guid: 'plex://track/999',
        type: 'track',
        title: 'Unknown Track',
        addedAt: Date.now(),
        updatedAt: Date.now(),
      };

      const embedded = (manager as any).plexToEmbedded(plexItem);

      expect(embedded.title).toBe('Unknown Track');
      expect(embedded.artist).toBeUndefined();
      expect(embedded.album).toBeUndefined();
      expect(embedded.year).toBeUndefined();
      expect(embedded.genre).toBeUndefined();
    });
  });

  describe('File System Access', () => {
    describe('validateAccess', () => {
      it('should validate read and write access', async () => {
        mockElectron.checkAccess.mockResolvedValue({
          canRead: true,
          canWrite: true,
        });

        const result = await manager.validateAccess('/path/to/directory');

        expect(result.canRead).toBe(true);
        expect(result.canWrite).toBe(true);
        expect(result.path).toBe('/path/to/directory');
        expect(result.error).toBeUndefined();
      });

      it('should handle read-only access', async () => {
        mockElectron.checkAccess.mockResolvedValue({
          canRead: true,
          canWrite: false,
        });

        const result = await manager.validateAccess('/path/to/directory');

        expect(result.canRead).toBe(true);
        expect(result.canWrite).toBe(false);
      });

      it('should handle no access', async () => {
        mockElectron.checkAccess.mockResolvedValue({
          canRead: false,
          canWrite: false,
        });

        const result = await manager.validateAccess('/path/to/directory');

        expect(result.canRead).toBe(false);
        expect(result.canWrite).toBe(false);
      });
    });
  });

  describe('Sync Operations', () => {
    it('should sync Plex metadata to local NFO file', async () => {
      const mockMetadataManager = {
        getMetadata: vi.fn().mockResolvedValue({
          ratingKey: '123',
          type: 'movie',
          title: 'The Matrix',
          year: 1999,
          Media: [
            {
              Part: [
                {
                  file: '/movies/The Matrix (1999)/The Matrix.mkv',
                },
              ],
            },
          ],
        }),
      };

      const managerWithMM = new LocalMetadataManager(mockMetadataManager as any);
      (global as any).window = { electron: mockElectron };

      mockElectron.writeFile.mockResolvedValue(true);

      const result = await managerWithMM.syncToLocal(
        {
          ratingKey: '123',
          key: '/library/metadata/123',
          guid: 'plex://movie/123',
          type: 'movie',
          title: 'The Matrix',
          year: 1999,
          summary: 'A computer hacker learns about the true nature of reality.',
          addedAt: Date.now(),
          updatedAt: Date.now(),
          Media: [
            {
              Part: [
                {
                  file: '/movies/The Matrix (1999)/The Matrix.mkv',
                },
              ],
            },
          ],
        } as any,
        {
          target: 'local',
          localFormat: 'nfo',
          createBackup: false,
        }
      );

      expect(result.success).toBe(true);
      expect(result.nfoUpdated).toBe(true);
      expect(result.embeddedUpdated).toBe(false);
      expect(mockElectron.writeFile).toHaveBeenCalled();
    });

    it('should sync Plex metadata to embedded tags', async () => {
      const mockMetadataManager = {
        getMetadata: vi.fn(),
      };

      const managerWithMM = new LocalMetadataManager(mockMetadataManager as any);
      (global as any).window = { electron: mockElectron };

      mockElectron.writeEmbeddedMetadata.mockResolvedValue(true);

      const result = await managerWithMM.syncToLocal(
        {
          ratingKey: '456',
          key: '/library/metadata/456',
          guid: 'plex://track/456',
          type: 'track',
          title: 'Bohemian Rhapsody',
          grandparentTitle: 'Queen',
          parentTitle: 'A Night at the Opera',
          year: 1975,
          index: 11,
          addedAt: Date.now(),
          updatedAt: Date.now(),
          Media: [
            {
              Part: [
                {
                  file: '/music/Queen/A Night at the Opera/11 - Bohemian Rhapsody.mp3',
                },
              ],
            },
          ],
        } as any,
        {
          target: 'local',
          localFormat: 'embedded',
          createBackup: false,
        }
      );

      expect(result.success).toBe(true);
      expect(result.nfoUpdated).toBe(false);
      expect(result.embeddedUpdated).toBe(true);
      expect(mockElectron.writeEmbeddedMetadata).toHaveBeenCalled();
    });

    it('should sync to both NFO and embedded', async () => {
      const mockMetadataManager = {
        getMetadata: vi.fn(),
      };

      const managerWithMM = new LocalMetadataManager(mockMetadataManager as any);
      (global as any).window = { electron: mockElectron };

      mockElectron.writeFile.mockResolvedValue(true);
      mockElectron.writeEmbeddedMetadata.mockResolvedValue(true);

      const result = await managerWithMM.syncToLocal(
        {
          ratingKey: '789',
          key: '/library/metadata/789',
          guid: 'plex://track/789',
          type: 'track',
          title: 'Test Song',
          addedAt: Date.now(),
          updatedAt: Date.now(),
          Media: [
            {
              Part: [
                {
                  file: '/music/test.mp3',
                },
              ],
            },
          ],
        } as any,
        {
          target: 'local',
          localFormat: 'both',
          createBackup: false,
        }
      );

      expect(result.success).toBe(true);
      expect(result.nfoUpdated).toBe(true);
      expect(result.embeddedUpdated).toBe(true);
    });

    it('should handle sync errors gracefully', async () => {
      const mockMetadataManager = {
        getMetadata: vi.fn(),
      };

      const managerWithMM = new LocalMetadataManager(mockMetadataManager as any);
      (global as any).window = { electron: mockElectron };

      const result = await managerWithMM.syncToLocal(
        {
          ratingKey: '999',
          key: '/library/metadata/999',
          guid: 'plex://movie/999',
          type: 'movie',
          title: 'Test Movie',
          addedAt: Date.now(),
          updatedAt: Date.now(),
          // No Media field - should cause error
        } as any,
        {
          target: 'local',
          localFormat: 'nfo',
        }
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
