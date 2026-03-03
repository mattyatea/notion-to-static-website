/**
 * Caching utilities for Notion API responses
 * @file Provides in-memory caching with TTL and stale-while-revalidate support
 */

import type { CacheConfig } from '@/types/notion';
import { log } from './client';

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  refreshThreshold: 0.8, // Refresh at 80% of TTL
};

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const cache: Record<string, CacheItem<unknown>> = {};

/**
 * Get data from cache or fetch fresh data with automatic background refresh
 * @param key Cache key identifier
 * @param fetchFn Async function to fetch fresh data
 * @param config Cache configuration (TTL, refresh threshold)
 * @returns Cached or freshly fetched data
 */
export async function getFromCacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig = DEFAULT_CACHE_CONFIG
): Promise<T> {
  const now = Date.now();
  const cachedItem = cache[key];

  if (cachedItem) {
    if (now < cachedItem.expiresAt) {
      if (now > cachedItem.timestamp + config.ttl * (config.refreshThreshold || 0.8)) {
        log('debug', `Refreshing cache in background: ${key}`);
        fetchFn()
          .then((data) => {
            cache[key] = {
              data,
              timestamp: Date.now(),
              expiresAt: Date.now() + config.ttl,
            };
            log('debug', `Cache refreshed in background: ${key}`);
          })
          .catch((err) => {
            log('warn', `Failed to refresh cache in background: ${key}`, err);
          });
      }
      return cachedItem.data as T;
    }
  }

  try {
    log('debug', `Fetching fresh data for: ${key}`);
    const data = await fetchFn();

    cache[key] = {
      data,
      timestamp: now,
      expiresAt: now + config.ttl,
    };

    return data;
  } catch (error) {
    log('error', `Failed to fetch data for: ${key}`, error);

    if (cachedItem) {
      log('warn', `Using expired cache as fallback for: ${key}`);
      return cachedItem.data as T;
    }

    throw error;
  }
}

/**
 * Clear cached entries
 * @param keyPrefix Optional prefix to clear specific entries only
 */
export function clearCache(keyPrefix?: string): void {
  if (keyPrefix) {
    Object.keys(cache).forEach((key) => {
      if (key.startsWith(keyPrefix)) {
        delete cache[key];
      }
    });
    log('info', `Cleared cache with prefix: ${keyPrefix}`);
  } else {
    Object.keys(cache).forEach((key) => {
      delete cache[key];
    });
    log('info', 'Cleared all cache');
  }
}
