import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseChangelog } from '../src/services/update/changelog';
import { aggregateUnseenReleases } from '../src/services/update/aggregator';
import {
  initializeStorage,
  getLastSeenVersion,
  setLastSeenVersion,
  addSeenVersion,
  hasSeenVersion,
} from '../src/services/update/versionStorage';

const SAMPLE_CHANGELOG = `
# Changelog
All notable changes...

## [1.4.0] - 2025-08-01
### Added
- Aggregated update notification modal that shows notes from multiple versions.
### Changed
- Update notification now triggers only for minor and major versions by default.

## [1.3.0] - 2025-07-15
### Added
- Link preview caching improvements and UI polish.

## [1.2.1] - 2025-07-08
### Fixed
- Minor bug in history pruning causing off-by-one timestamps.

## [1.2.0-beta.1] - 2025-07-01
### Added
- Experimental prerelease channel for update notifications.

## [1.1.0] - 2025-06-20
### Added
- New settings import/export confirmation prompts.

## [1.0.0] - 2025-06-01
### Added
- Initial public release.
`;

describe('changelog parser', () => {
  it('parses releases and sections', () => {
    const releases = parseChangelog(SAMPLE_CHANGELOG);
    // sorted desc
    expect(releases[0].version).toBe('1.4.0');
    expect(releases.at(-1)?.version).toBe('1.0.0');
    const r140 = releases.find(r => r.version === '1.4.0')!;
    expect(r140.sections.Added?.length).toBeGreaterThan(0);
  });
});

describe('aggregation logic', () => {
  const releases = parseChangelog(SAMPLE_CHANGELOG);

  it('aggregates unseen versions (minor/major only) oldest-first', () => {
    const unseen = aggregateUnseenReleases(releases, '1.1.0', '1.4.0', {
      minorMajorOnly: true,
      allowPrereleaseIfFromPrerelease: true,
    });
    // Expected: 1.3.0 and 1.4.0 (skip 1.2.1 patch)
    expect(unseen.map(r => r.version)).toEqual(['1.3.0', '1.4.0']);
  });

  it('includes prerelease only if lastSeen was prerelease when gating is enabled', () => {
    const withGate = aggregateUnseenReleases(releases, '1.1.0', '1.2.0-beta.1', {
      minorMajorOnly: true,
      allowPrereleaseIfFromPrerelease: true,
    });
    // lastSeen stable => prerelease gated out
    expect(withGate.map(r => r.version)).toEqual([]);

    const allow = aggregateUnseenReleases(releases, '1.1.0-beta.1', '1.2.0-beta.1', {
      minorMajorOnly: true,
      allowPrereleaseIfFromPrerelease: true,
    });
    // from prerelease channel => allowed
    expect(allow.map(r => r.version)).toEqual(['1.2.0-beta.1']);
  });
});

describe('version storage', () => {
  const memoryStore = new Map<string, string>();

  // mock localStorage for jsdom/vitest
  const localStorageMock = {
    getItem: (k: string) => (memoryStore.has(k) ? memoryStore.get(k)! : null),
    setItem: (k: string, v: string) => {
      memoryStore.set(k, v);
    },
    removeItem: (k: string) => {
      memoryStore.delete(k);
    },
    clear: () => {
      memoryStore.clear();
    },
  } as unknown as Storage;

  beforeEach(() => {
    // @ts-ignore override global
    global.localStorage = localStorageMock;
    memoryStore.clear();
    initializeStorage();
  });

  it('initializes schema and persists last seen', () => {
    expect(getLastSeenVersion()).toBeNull();
    setLastSeenVersion('1.3.0');
    expect(getLastSeenVersion()).toBe('1.3.0');
  });

  it('tracks seen versions set', () => {
    expect(hasSeenVersion('1.4.0')).toBe(false);
    addSeenVersion('1.4.0');
    expect(hasSeenVersion('1.4.0')).toBe(true);
    // idempotent
    addSeenVersion('1.4.0');
    expect(hasSeenVersion('1.4.0')).toBe(true);
  });
});