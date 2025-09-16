import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { onRequestGet, Env } from '../functions/api/proxy-favicon';

describe('proxy-favicon handler', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('streams through raster favicons unchanged', async () => {
    fetchMock.mockResolvedValueOnce(new Response('png-data', {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));

    const request = new Request('https://example.com/api/proxy-favicon?url=https://remote.test/favicon.png');
    const response = await onRequestGet({ request, env: {} as Env });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(await response.text()).toBe('png-data');
  });

  it('rejects SVG favicons with UNSUPPORTED_TYPE', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<svg></svg>', {
      status: 200,
      headers: { 'content-type': 'image/svg+xml' },
    }));

    const request = new Request('https://example.com/api/proxy-favicon?url=https://remote.test/favicon.svg');
    const response = await onRequestGet({ request, env: {} as Env });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(response.status).toBe(415);
    expect(response.headers.get('x-error-code')).toBe('UNSUPPORTED_TYPE');
    const body = await response.json();
    expect(body).toMatchObject({ error: true, code: 'UNSUPPORTED_TYPE' });
  });
});
