// lib/cache/api-cache.ts
// In-memory LRU cache for external API responses with size limits

import { LRUCache } from './lru-cache';

// Use LRU cache with max 1000 entries to prevent memory leaks
const cache = new LRUCache(1000);
const DEFAULT_TTL_MS = 60 * 1000; // 1 minute default

// Simple wrapper class for backward compatibility
export const apiCache = {
  get<T>(key: string): T | null {
    return cache.get(key) as T | null;
  },

  set<T>(key: string, data: T, ttl?: number): void {
    cache.set(key, data, (ttl || DEFAULT_TTL_MS) / 1000);
  },

  delete(key: string): void {
    cache.delete(key);
  },

  clear(): void {
    cache.clear();
  },

  size(): number {
    return cache.size;
  },

  cleanExpired(): void {
    cache.prune();
  },

  stats() {
    return cache.stats;
  }
};

// Clean expired entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    cache.prune();
  }, 5 * 60 * 1000);
}

// Default timeout for API requests
const DEFAULT_TIMEOUT = 10000;

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url: string, options?: RequestInit, timeout = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cached fetch wrapper
 * Automatically caches GET requests with timeout support
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  ttl?: number
): Promise<T> {
  // Only cache GET requests
  const method = options?.method || 'GET';

  if (method !== 'GET') {
    const response = await fetchWithTimeout(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  // Check cache first
  const cacheKey = url;
  const cached = apiCache.get<T>(cacheKey);

  if (cached !== null) {
    return cached;
  }

  // Fetch from API with timeout
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache the result
  apiCache.set(cacheKey, data, ttl);

  return data;
}

/**
 * Batch fetch with concurrency limit
 * Prevents overwhelming external APIs with too many concurrent requests
 */
export async function batchCachedFetch<T>(
  urls: string[],
  options?: RequestInit,
  ttl?: number,
  concurrency: number = 5
): Promise<Map<string, T | null>> {
  const results = new Map<string, T | null>();
  const uncachedUrls: string[] = [];

  // Check cache first for all URLs
  for (const url of urls) {
    const cached = apiCache.get<T>(url);
    if (cached !== null) {
      results.set(url, cached);
    } else {
      uncachedUrls.push(url);
    }
  }

  // Fetch uncached URLs with concurrency limit
  if (uncachedUrls.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < uncachedUrls.length; i += concurrency) {
      chunks.push(uncachedUrls.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (url) => {
        try {
          const response = await fetchWithTimeout(url, options);
          if (!response.ok) {
            console.warn(`Failed to fetch ${url}: ${response.status}`);
            return { url, data: null };
          }
          const data = await response.json();
          apiCache.set(url, data, ttl);
          return { url, data };
        } catch (error) {
          console.warn(`Error fetching ${url}:`, error);
          return { url, data: null };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      for (const { url, data } of chunkResults) {
        results.set(url, data);
      }
    }
  }

  return results;
}
