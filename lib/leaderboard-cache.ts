/**
 * Leaderboard Cache Manager
 *
 * Manages reading and writing leaderboard data from file cache
 * with in-memory caching for performance
 */

import fs from 'fs'
import path from 'path'
import { LeaderboardEntry } from '@/lib/dune-leaderboard'

const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'leaderboard-cache.json')

export interface LeaderboardCache {
  data: LeaderboardEntry[]
  lastUpdated: string
  total: number
}

// In-memory cache to avoid reading file on every request
let memoryCache: LeaderboardCache | null = null
let lastFileModTime: number = 0

/**
 * Read leaderboard data from cache file with in-memory caching
 */
export function readLeaderboardCache(): LeaderboardCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      return null
    }

    // Check if file has been modified since last read
    const stats = fs.statSync(CACHE_FILE_PATH)
    const currentModTime = stats.mtimeMs

    // Return in-memory cache if file hasn't changed
    if (memoryCache && currentModTime === lastFileModTime) {
      return memoryCache
    }

    // File changed or first load, read from disk
    const fileContent = fs.readFileSync(CACHE_FILE_PATH, 'utf-8')
    memoryCache = JSON.parse(fileContent)
    lastFileModTime = currentModTime

    return memoryCache
  } catch (error) {
    return null
  }
}

/**
 * Get leaderboard data from cache or return empty array
 */
export function getLeaderboardData(): LeaderboardEntry[] {
  const cache = readLeaderboardCache()
  return cache?.data || []
}

/**
 * Get cache metadata
 */
export function getCacheMetadata(): { lastUpdated: string | null; total: number } {
  const cache = readLeaderboardCache()
  return {
    lastUpdated: cache?.lastUpdated || null,
    total: cache?.total || 0,
  }
}
