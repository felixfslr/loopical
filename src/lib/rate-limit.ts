const stores = new Map<string, Map<string, { count: number; resetAt: number }>>()

export function rateLimit(options: { interval: number; maxRequests: number }) {
  const { interval, maxRequests } = options

  // Each rateLimit() call gets its own store (keyed by interval+max combo)
  const storeKey = `${interval}:${maxRequests}`
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map())
  }
  const store = stores.get(storeKey)!

  // Cleanup expired entries periodically
  if (typeof globalThis !== 'undefined') {
    const cleanupKey = `__rateLimit_cleanup_${storeKey}`
    if (!(globalThis as any)[cleanupKey]) {
      ;(globalThis as any)[cleanupKey] = setInterval(() => {
        const now = Date.now()
        for (const [key, value] of store) {
          if (now > value.resetAt) store.delete(key)
        }
      }, 60_000)
    }
  }

  return {
    check(ip: string): { success: boolean; remaining: number } {
      const now = Date.now()
      const entry = store.get(ip)

      if (!entry || now > entry.resetAt) {
        store.set(ip, { count: 1, resetAt: now + interval })
        return { success: true, remaining: maxRequests - 1 }
      }

      if (entry.count >= maxRequests) {
        return { success: false, remaining: 0 }
      }

      entry.count++
      return { success: true, remaining: maxRequests - entry.count }
    },
  }
}

// Pre-configured limiters for API routes
export const feedbackLimiter = rateLimit({ interval: 60_000, maxRequests: 10 })
export const questionAudioLimiter = rateLimit({ interval: 60_000, maxRequests: 10 })
