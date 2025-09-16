/**
 * Version persistence with localStorage, namespaced keys, simple migrations,
 * and multi-tab synchronization helpers.
 */

export type StorageSchema = {
  schemaVersion: number;
  lastSeenVersion: string | null;
  seenVersions: string[]; // normalized semver strings
  silentVersions?: string[]; // optional: versions to suppress notifications
};

const NS = 'app:update';
const KEY_SCHEMA_VERSION = `${NS}:schemaVersion`;
const KEY_LAST_SEEN = `${NS}:lastSeenVersion`;
const KEY_SEEN_SET = `${NS}:seenVersions`;
const KEY_SILENT = `${NS}:silentVersions`;

const CURRENT_SCHEMA = 1;

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function initializeStorage(): void {
  // Basic migration strategy: if schemaVersion missing, set defaults.
  const schema = Number(localStorage.getItem(KEY_SCHEMA_VERSION) || '0');
  if (schema !== CURRENT_SCHEMA) {
    // Migrate or initialize
    if (schema === 0) {
      // Fresh install: set defaults if not present
      if (localStorage.getItem(KEY_LAST_SEEN) === null) {
        localStorage.setItem(KEY_LAST_SEEN, JSON.stringify(null));
      }
      if (localStorage.getItem(KEY_SEEN_SET) === null) {
        localStorage.setItem(KEY_SEEN_SET, JSON.stringify([]));
      }
      if (localStorage.getItem(KEY_SILENT) === null) {
        localStorage.setItem(KEY_SILENT, JSON.stringify([]));
      }
    }
    // Write current schema version
    localStorage.setItem(KEY_SCHEMA_VERSION, String(CURRENT_SCHEMA));
  }
}

export function getLastSeenVersion(): string | null {
  const v = safeParseJSON<string | null>(localStorage.getItem(KEY_LAST_SEEN));
  return v ?? null;
}

export function setLastSeenVersion(version: string | null): void {
  localStorage.setItem(KEY_LAST_SEEN, JSON.stringify(version));
}

export function getSeenVersions(): Set<string> {
  const arr = safeParseJSON<string[]>(localStorage.getItem(KEY_SEEN_SET)) ?? [];
  return new Set(arr);
}

export function addSeenVersion(version: string): void {
  const set = getSeenVersions();
  if (!set.has(version)) {
    set.add(version);
    localStorage.setItem(KEY_SEEN_SET, JSON.stringify([...set]));
  }
}

export function hasSeenVersion(version: string): boolean {
  return getSeenVersions().has(version);
}

export function getSilentVersions(): Set<string> {
  const arr = safeParseJSON<string[]>(localStorage.getItem(KEY_SILENT)) ?? [];
  return new Set(arr);
}

export function addSilentVersion(version: string): void {
  const set = getSilentVersions();
  if (!set.has(version)) {
    set.add(version);
    localStorage.setItem(KEY_SILENT, JSON.stringify([...set]));
  }
}

export function removeSilentVersion(version: string): void {
  const set = getSilentVersions();
  if (set.delete(version)) {
    localStorage.setItem(KEY_SILENT, JSON.stringify([...set]));
  }
}

/**
 * Subscribe to storage changes across tabs for given keys.
 * Returns an unsubscribe function.
 */
export function onStorageChange(keys: string[], cb: (key: string, newValue: string | null, oldValue: string | null) => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.storageArea !== localStorage) return;
    if (!e.key) return;
    if (keys.includes(e.key)) {
      cb(e.key, e.newValue, e.oldValue);
    }
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

/**
 * Convenience helper: broadcast a ping update by toggling a nonce value.
 */
const KEY_PING = `${NS}:ping`;
export function broadcastPing(): void {
  localStorage.setItem(KEY_PING, String(Date.now()));
}
export function onPing(cb: () => void): () => void {
  return onStorageChange([KEY_PING], () => cb());
}