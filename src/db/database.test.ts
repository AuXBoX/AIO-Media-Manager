import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, AIOMediaManagerDB } from './database';

// Note: These tests require a browser environment with IndexedDB support
// They will be skipped in jsdom environment
// Run with: npm run test:e2e or in a real browser environment

describe.skip('AIOMediaManagerDB', () => {
  let testDb: AIOMediaManagerDB;

  beforeEach(async () => {
    testDb = new AIOMediaManagerDB();
    await testDb.open();
  });

  afterEach(async () => {
    await testDb.delete();
    await testDb.close();
  });

  describe('Metadata Store', () => {
    it('should add and retrieve metadata', async () => {
      const metadata = {
        ratingKey: 'test-123',
        sectionId: 'section-1',
        type: 'movie',
        data: { title: 'Test Movie' },
        cachedAt: Date.now(),
        lastModified: Date.now(),
        dirty: false,
      };

      await testDb.metadata.add(metadata);
      const retrieved = await testDb.metadata.get('test-123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.ratingKey).toBe('test-123');
      expect(retrieved?.type).toBe('movie');
    });

    it('should query metadata by sectionId', async () => {
      await testDb.metadata.bulkAdd([
        {
          ratingKey: 'movie-1',
          sectionId: 'movies',
          type: 'movie',
          data: {},
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
        {
          ratingKey: 'movie-2',
          sectionId: 'movies',
          type: 'movie',
          data: {},
          cachedAt: Date.now(),
          lastModified: Date.now(),
          dirty: false,
        },
      ]);

      const results = await testDb.metadata
        .where('sectionId')
        .equals('movies')
        .toArray();

      expect(results).toHaveLength(2);
    });
  });

  describe('Offline Changes Store', () => {
    it('should add and retrieve offline changes', async () => {
      const change = {
        id: 'change-1',
        timestamp: Date.now(),
        type: 'update' as const,
        ratingKey: 'test-123',
        data: { title: 'Updated Title' },
        synced: false,
      };

      await testDb.offlineChanges.add(change);
      const retrieved = await testDb.offlineChanges.get('change-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.synced).toBe(false);
    });

    it('should query unsynced changes', async () => {
      await testDb.offlineChanges.bulkAdd([
        {
          id: 'change-1',
          timestamp: Date.now(),
          type: 'update',
          ratingKey: 'test-1',
          data: {},
          synced: false,
        },
        {
          id: 'change-2',
          timestamp: Date.now(),
          type: 'update',
          ratingKey: 'test-2',
          data: {},
          synced: true,
        },
      ]);

      const unsynced = await testDb.offlineChanges
        .where('synced')
        .equals(0)
        .toArray();

      expect(unsynced).toHaveLength(1);
      expect(unsynced[0]?.id).toBe('change-1');
    });
  });

  describe('User Preferences Store', () => {
    it('should store and retrieve preferences', async () => {
      await testDb.userPreferences.put({
        key: 'theme',
        value: 'dark',
        updatedAt: Date.now(),
      });

      const pref = await testDb.userPreferences.get('theme');
      expect(pref?.value).toBe('dark');
    });

    it('should update existing preferences', async () => {
      await testDb.userPreferences.put({
        key: 'theme',
        value: 'light',
        updatedAt: Date.now(),
      });

      await testDb.userPreferences.put({
        key: 'theme',
        value: 'dark',
        updatedAt: Date.now(),
      });

      const pref = await testDb.userPreferences.get('theme');
      expect(pref?.value).toBe('dark');
    });
  });

  describe('Filter Presets Store', () => {
    it('should add and retrieve filter presets', async () => {
      const preset = {
        id: 'preset-1',
        name: 'My Preset',
        criteria: { genre: 'Action' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await testDb.filterPresets.add(preset);
      const retrieved = await testDb.filterPresets.get('preset-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('My Preset');
    });
  });
});
