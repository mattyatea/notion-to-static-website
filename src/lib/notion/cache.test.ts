import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { clearCache, getFormattedDatabase, getPage } from './index';
import { getFromCacheOrFetch } from './cache';
import { mockDatabaseQueryResponse, mockPageResponse } from '@/test/mocks/notionData';

type GlobalNotionMocks = {
  mockRetrieve: Mock;
  mockQueryDataSource: Mock;
};

const { mockRetrieve, mockQueryDataSource } = globalThis as unknown as GlobalNotionMocks;

describe('Notion cache module', () => {
  beforeEach(() => {
    mockRetrieve.mockReset();
    mockQueryDataSource.mockReset();
    clearCache();
  });

  describe('clearCache', () => {
    it('clears all cached entries', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);

      await getPage('cache-test');
      clearCache();
      await getPage('cache-test');

      expect(mockRetrieve).toHaveBeenCalledTimes(2);
    });

    it('clears only matching cache key prefix', async () => {
      mockRetrieve.mockResolvedValue(mockPageResponse);
      mockQueryDataSource.mockResolvedValue(mockDatabaseQueryResponse);

      await getPage('page-1');
      await getFormattedDatabase();

      clearCache('page:');

      await getPage('page-1');
      await getFormattedDatabase();

      expect(mockRetrieve).toHaveBeenCalledTimes(2);
      expect(mockQueryDataSource).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFromCacheOrFetch', () => {
    it('returns stale cache value when refresh fails after TTL', async () => {
      vi.useFakeTimers();

      const fetchFn = vi
        .fn<() => Promise<string>>()
        .mockResolvedValueOnce('initial-value')
        .mockRejectedValueOnce(new Error('refresh failed'));

      const key = 'cache:test:fallback';
      const ttl = 100;

      await expect(getFromCacheOrFetch(key, fetchFn, { ttl, refreshThreshold: 0.8 })).resolves.toBe(
        'initial-value'
      );

      vi.advanceTimersByTime(ttl + 1);

      await expect(getFromCacheOrFetch(key, fetchFn, { ttl, refreshThreshold: 0.8 })).resolves.toBe(
        'initial-value'
      );

      expect(fetchFn).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });
  });
});
