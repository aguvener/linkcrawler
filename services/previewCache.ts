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

// IndexedDB-backed persistence for warm reloads
type IDBRecord = {
  value: PreviewResult;
  expiresAt: number;
};

const IDB_DB_NAME = 'linkcrawler';
const IDB_STORE = 'previewCache';
let idbReady: Promise<IDBDatabase | null> | null = null;

function openIDB(): Promise<IDBDatabase | null> {
  if (idbReady) return idbReady;
  if (!isClient() || !('indexedDB' in window)) {
    idbReady = Promise.resolve(null);
    return idbReady;
  }
  idbReady = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idbReady;
}

async function idbGet(keyStr: string): Promise<IDBRecord | null> {
  const db = await openIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(keyStr);
      req.onsuccess = () => resolve((req.result as IDBRecord) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(keyStr: string, rec: IDBRecord): Promise<void> {
  const db = await openIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const req = store.put(rec, keyStr);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

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

async function getFromPersistent(url: string): Promise<PreviewResult | undefined> {
  const k = key(url);
  const rec = await idbGet(k);
  if (!rec) return undefined;
  if (Date.now() > rec.expiresAt) return undefined;
  // populate memory cache
  cache.set(k, rec);
  return rec.value;
}

/**
 * Set a cache entry with TTL (ms)
 */
export function set(url: string, value: PreviewResult, ttlMs: number): void {
  const k = key(url);
  const expiresAt = Date.now() + Math.max(0, ttlMs);
  const rec: CacheEntry = { value, expiresAt };
  cache.set(k, rec);
  // fire-and-forget persistence
  void idbSet(k, rec);
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

  // Try persistent cache asynchronously
  const fromIDB = await getFromPersistent(k);
  if (fromIDB) return fromIDB;

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
