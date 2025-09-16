import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPreviewClientOnly } from '../src/services/fetchPreview';

describe('fetchPreviewClientOnly', () => {
  const origFetch = global.fetch;
  const origWindow = global.window as any;

  beforeEach(() => {
    vi.useFakeTimers();
    (global as any).window = { setTimeout, clearTimeout } as any;
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = origFetch as any;
    (global as any).window = origWindow;
  });

  it('rejects non-http(s) URLs before calling fetch', async () => {
    const res = await fetchPreviewClientOnly('mailto:test@example.com');
    expect((res as any).error).toBe(true);
    expect((res as any).code).toBe('INVALID_URL');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns sanitized preview on 200', async () => {
    (global.fetch as any).mockResolvedValueOnce(new Response(
      JSON.stringify({
        url: 'https://ex.ample/page',
        title: '<b>Bold</b> &amp; Title',
        description: 'Desc with <script>alert(1)</script>',
        siteName: 'Site',
        images: ['https://ex.ample/img.png'],
        favicon: 'https://ex.ample/favicon.ico'
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    ));

    const res = await fetchPreviewClientOnly('https://ex.ample/page');
    expect('error' in res).toBe(false);
    if ('error' in res) return;
    expect(res.title).toContain('&lt;b&gt;Bold');
    expect(res.description).not.toContain('<script>');
    expect(res.images?.[0]).toBe('https://ex.ample/img.png');
    expect(res.favicon).toContain('/api/proxy-favicon?url=');
  });

  it('maps 204 to EMPTY_PREVIEW', async () => {
    (global.fetch as any).mockResolvedValueOnce(new Response(null, { status: 204 }));
    const res = await fetchPreviewClientOnly('https://ex.ample/page');
    expect((res as any).error).toBe(true);
    expect((res as any).code).toBe('EMPTY_PREVIEW');
  });

  it('maps 400 to INVALID_URL', async () => {
    (global.fetch as any).mockResolvedValueOnce(new Response('bad', { status: 400 }));
    const res = await fetchPreviewClientOnly('https://ex.ample/page');
    expect((res as any).error).toBe(true);
    expect((res as any).code).toBe('INVALID_URL');
  });

  it('handles timeout as AbortError', async () => {
    (global.fetch as any).mockImplementationOnce((_url: string, opts: any) => {
      const p = new Promise((_resolve, reject) => {
        // Simulate fetch rejecting due to abort
        setTimeout(() => {
          const err: any = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        }, 0);
        // Optionally hook signal.abort, but above is enough
      });
      return p;
    });

    const promise = fetchPreviewClientOnly('https://ex.ample/page', { timeoutMs: 10 });
    vi.runAllTimers();
    const res = await promise;
    expect((res as any).error).toBe(true);
    expect((res as any).code).toBe('TIMEOUT');
  });
});
