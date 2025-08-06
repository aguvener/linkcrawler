/**
 * In-memory cache and in-flight throttling for link previews
 * Client-only (guards SSR). Provides TTL-based caching and per-URL promise deduplication.
 */

export type PreviewData = {
  url: string;
  title?: string;
  description?: string;
  siteName?: string;
  images?: string[];
  mediaType?: string;
  favicon?: string;
};

export type PreviewError = {
  error: true;
  message: string;
  code?: string;
};

export type PreviewResult = PreviewData | PreviewError;

type CacheEntry = {
  value: PreviewResult;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<PreviewResult>>();

/**
 * Check if running in a browser environment
 */
export function isClient(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Returns a normalized cache key for a URL.
 */
function key(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Get an entry if valid (not expired)
 */
export function get(url: string): PreviewResult | undefined {
  const k = key(url);
  const entry = cache.get(k);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(k);
    return undefined;
  }
  return entry.value;
}

/**
 * Set a cache entry with TTL (ms)
 */
export function set(url: string, value: PreviewResult, ttlMs: number): void {
  const k = key(url);
  cache.set(k, { value, expiresAt: Date.now() + Math.max(0, ttlMs) });
}

/**
 * Clear expired entries
 */
export function clearExpired(): void {
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (now > v.expiresAt) {
      cache.delete(k);
    }
  }
}

/**
 * Get or fetch with in-flight deduplication and caching.
 * The fetcher must return a sanitized PreviewResult.
 */
export async function getOrFetch(
  url: string,
  fetcher: (url: string) => Promise<PreviewResult>,
  ttlMs: number
): Promise<PreviewResult> {
  const k = key(url);

  const cached = get(k);
  if (cached) return cached;

  if (inflight.has(k)) {
    return inflight.get(k)!;
  }

  const p = (async () => {
    try {
      const result = await fetcher(url);
      // Cache even errors for a short time to avoid thundering herd on failing URLs
      const effectiveTtl = "error" in result && result.error ? Math.min(ttlMs, 60_000) : ttlMs;
      set(url, result, effectiveTtl);
      return result;
    } finally {
      inflight.delete(k);
    }
  })();

  inflight.set(k, p);
  return p;
}

/**
 * Evict a specific URL from cache
 */
export function evict(url: string): void {
  cache.delete(key(url));
}

/**
 * Utility: extract display domain safely
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}