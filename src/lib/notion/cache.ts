/**
 * Caching utilities for Notion API responses
 * @file Provides in-memory caching with TTL and stale-while-revalidate support
 */

import type { CacheConfig } from "@/types/notion";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { log } from "./client";

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
const defaultCacheFile = process.env.CF_PAGES
  ? ".wrangler/cache/notion-api-cache.json"
  : ".cache/notion-api-cache.json";
const PERSISTENT_CACHE_FILE = resolve(
  process.cwd(),
  process.env.NOTION_CACHE_FILE || defaultCacheFile,
);

const shouldPersistCache =
  process.env.NODE_ENV !== "test" && process.env.NOTION_CACHE_PERSIST === "1";

let persistentCacheLoaded = false;

function loadPersistentCache(): void {
  if (!shouldPersistCache || persistentCacheLoaded) {
    return;
  }

  persistentCacheLoaded = true;

  if (!existsSync(PERSISTENT_CACHE_FILE)) {
    return;
  }

  try {
    const raw = readFileSync(PERSISTENT_CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, CacheItem<unknown>>;

    Object.entries(parsed).forEach(([key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        typeof value.timestamp === "number" &&
        typeof value.expiresAt === "number" &&
        "data" in value
      ) {
        cache[key] = value;
      }
    });

    log("debug", `Loaded persistent Notion cache from ${PERSISTENT_CACHE_FILE}`);
  } catch (error) {
    log("warn", `Failed to load persistent cache: ${PERSISTENT_CACHE_FILE}`, error);
  }
}

function persistCacheToDisk(): void {
  if (!shouldPersistCache) {
    return;
  }

  try {
    mkdirSync(dirname(PERSISTENT_CACHE_FILE), { recursive: true });
    writeFileSync(PERSISTENT_CACHE_FILE, JSON.stringify(cache), "utf-8");
  } catch (error) {
    log("warn", `Failed to persist cache: ${PERSISTENT_CACHE_FILE}`, error);
  }
}

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
  config: CacheConfig = DEFAULT_CACHE_CONFIG,
): Promise<T> {
  loadPersistentCache();
  const now = Date.now();
  const cachedItem = cache[key];

  if (cachedItem) {
    if (now < cachedItem.expiresAt) {
      if (now > cachedItem.timestamp + config.ttl * (config.refreshThreshold || 0.8)) {
        log("debug", `Refreshing cache in background: ${key}`);
        fetchFn()
          .then((data) => {
            cache[key] = {
              data,
              timestamp: Date.now(),
              expiresAt: Date.now() + config.ttl,
            };
            persistCacheToDisk();
            log("debug", `Cache refreshed in background: ${key}`);
          })
          .catch((err) => {
            log("warn", `Failed to refresh cache in background: ${key}`, err);
          });
      }
      return cachedItem.data as T;
    }
  }

  try {
    log("debug", `Fetching fresh data for: ${key}`);
    const data = await fetchFn();

    cache[key] = {
      data,
      timestamp: now,
      expiresAt: now + config.ttl,
    };
    persistCacheToDisk();

    return data;
  } catch (error) {
    log("error", `Failed to fetch data for: ${key}`, error);

    if (cachedItem) {
      log("warn", `Using expired cache as fallback for: ${key}`);
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
  loadPersistentCache();

  if (keyPrefix) {
    Object.keys(cache).forEach((key) => {
      if (key.startsWith(keyPrefix)) {
        delete cache[key];
      }
    });
    log("info", `Cleared cache with prefix: ${keyPrefix}`);
  } else {
    Object.keys(cache).forEach((key) => {
      delete cache[key];
    });
    log("info", "Cleared all cache");
  }

  persistCacheToDisk();
}
