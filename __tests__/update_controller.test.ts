import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpdateController } from '../services/update/controller';
import { setLastSeenVersion, addSilentVersion } from '../services/update/versionStorage';

const SAMPLE = `
# Changelog
\n## [1.3.0] - 2025-08-01
### Fixed
- Fixes bugs.
\n## [1.2.0] - 2025-07-15
### Added
- New feature!
\n## [1.2.0-beta.1] - 2025-07-10
### Added
- Beta feature.
`;

describe('UpdateController', () => {
  const origFetch = global.fetch;

  beforeEach(() => {
    // fresh storage
    localStorage.clear();
    global.fetch = vi.fn(async (url: any) => {
      if (String(url).includes('CHANGELOG.md')) {
        return new Response(SAMPLE, { status: 200, headers: { 'content-type': 'text/markdown' } });
      }
      return new Response('not-found', { status: 404 });
    }) as any;
  });

  afterEach(() => {
    global.fetch = origFetch as any;
    localStorage.clear();
  });

  it('renders aggregated HTML for unseen minor/major releases', async () => {
    setLastSeenVersion('1.1.0');
    const onShow = vi.fn();
    const c = new UpdateController({ appVersion: '1.3.0', onShow });
    await c.init();
    expect(onShow).toHaveBeenCalledTimes(1);
    const html = onShow.mock.calls[0][0].html as string;
    expect(html).toContain('What’s new in'); // header wrapper
    expect(html).toMatch(/New feature!/);
    expect(html).toMatch(/Fixes bugs/);
  });

  it('respects silentVersions (filters out)', async () => {
    setLastSeenVersion('1.1.0');
    addSilentVersion('1.2.0');
    const onShow = vi.fn();
    const c = new UpdateController({ appVersion: '1.3.0', onShow });
    await c.init();
    expect(onShow).toHaveBeenCalledTimes(1);
    const html = onShow.mock.calls[0][0].html as string;
    expect(html).not.toMatch(/New feature!/); // 1.2.0 filtered out
    expect(html).toMatch(/Fixes bugs/);
  });

  it('gates prerelease when lastSeen was stable', async () => {
    setLastSeenVersion('1.1.0');
    const onShow = vi.fn();
    const c = new UpdateController({ appVersion: '1.2.0-beta.1', onShow });
    await c.init();
    expect(onShow).not.toHaveBeenCalled();
  });

  it('skips showing on downgrade', async () => {
    setLastSeenVersion('1.4.0');
    const onShow = vi.fn();
    const c = new UpdateController({ appVersion: '1.3.0', onShow });
    await c.init();
    expect(onShow).not.toHaveBeenCalled();
  });
});

