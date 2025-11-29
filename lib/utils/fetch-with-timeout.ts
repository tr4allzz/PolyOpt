/**
 * Fetch wrapper with timeout support
 * Prevents hanging requests from blocking the application
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number // Timeout in milliseconds (default: 10000)
}

export class FetchTimeoutError extends Error {
  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`)
    this.name = 'FetchTimeoutError'
  }
}

/**
 * Fetch with configurable timeout
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout (default 10s)
 * @returns Promise<Response>
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
    return response
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new FetchTimeoutError(url, timeout)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Fetch JSON with timeout and automatic parsing
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout
 * @returns Promise<T> - Parsed JSON response
 */
export async function fetchJsonWithTimeout<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<T> {
  const response = await fetchWithTimeout(url, options)

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Batch fetch with concurrency limit
 * @param urls - Array of URLs to fetch
 * @param options - Fetch options
 * @param concurrency - Max concurrent requests (default: 5)
 * @returns Promise<Array<Response | Error>>
 */
export async function batchFetch(
  urls: string[],
  options: FetchWithTimeoutOptions = {},
  concurrency: number = 5
): Promise<Array<{ url: string; response?: Response; error?: Error }>> {
  const results: Array<{ url: string; response?: Response; error?: Error }> = []
  const pending: Promise<void>[] = []

  for (const url of urls) {
    const promise = fetchWithTimeout(url, options)
      .then((response) => {
        results.push({ url, response })
      })
      .catch((error) => {
        results.push({ url, error })
      })

    pending.push(promise)

    // Wait for batch to complete if at concurrency limit
    if (pending.length >= concurrency) {
      await Promise.race(pending)
      // Remove completed promises
      const completed = pending.filter((p) => {
        // Check if promise is settled (hacky but works)
        let isSettled = false
        Promise.race([p, Promise.resolve('pending')]).then((result) => {
          isSettled = result !== 'pending'
        })
        return !isSettled
      })
      pending.length = 0
      pending.push(...completed)
    }
  }

  // Wait for remaining requests
  await Promise.all(pending)

  return results
}

/**
 * Retry fetch with exponential backoff
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithTimeoutOptions = {},
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options)

      // Retry on 429 (rate limit) or 5xx errors
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt)
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }
      }

      return response
    } catch (error: any) {
      lastError = error

      // Don't retry on timeout or abort
      if (error instanceof FetchTimeoutError) {
        throw error
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`)
}
