/**
 * LRU (Least Recently Used) Cache with TTL support
 * Prevents memory leaks by limiting cache size
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
  lastAccessed: number
}

export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>>
  private maxSize: number
  private hits: number = 0
  private misses: number = 0

  constructor(maxSize: number = 500) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.misses++
      return null
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    // Update last accessed time (move to end of Map for LRU)
    entry.lastAccessed = Date.now()
    this.cache.delete(key)
    this.cache.set(key, entry)

    this.hits++
    return entry.data
  }

  set(key: string, data: T, ttlSeconds: number): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest()
    }

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
      lastAccessed: Date.now(),
    })
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return false
    }
    return true
  }

  get size(): number {
    return this.cache.size
  }

  get stats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    }
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now()
    let pruned = 0

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt < now) {
        this.cache.delete(key)
        pruned++
      }
    }

    return pruned
  }

  private evictOldest(): void {
    // Map maintains insertion order, so first key is oldest
    // But we want LRU, so we need to find least recently accessed
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
}

// Global cache instances with size limits
export const apiCache = new LRUCache(500)      // For API responses
export const marketCache = new LRUCache(1000)  // For market data
export const userCache = new LRUCache(200)     // For user-specific data

// Helper functions for backward compatibility
export function getCached<T>(key: string): T | null {
  return apiCache.get(key) as T | null
}

export function setCache<T>(key: string, data: T, ttlSeconds: number): void {
  apiCache.set(key, data, ttlSeconds)
}

export function clearAllCaches(): void {
  apiCache.clear()
  marketCache.clear()
  userCache.clear()
}

// Auto-prune expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    apiCache.prune()
    marketCache.prune()
    userCache.prune()
  }, 5 * 60 * 1000)
}
