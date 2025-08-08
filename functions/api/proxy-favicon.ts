// Cloudflare Pages Function: /api/proxy-favicon
// Proxies a remote favicon/image over same-origin to avoid mixed content and referrer leakage.

export interface Env {
  // Optionally bind a KV for basic rate limiting in the future
  // RATELIMIT: KVNamespace;
}

const ALLOWED_CONTENT_TYPES = new Set([
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/png',
  'image/gif',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: true, message, code: 'BAD_REQUEST' }), {
    status: 400,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-error-code': 'BAD_REQUEST' },
  });
}

function upstreamError(status: number, code: string, message?: string) {
  return new Response(JSON.stringify({ error: true, message: message || `Upstream ${status}` , code }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-error-code': code },
  });
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const { request } = context;
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) return badRequest("Missing 'url' query parameter");

  let normalized: string;
  try {
    const u = new URL(target);
    if (!/^https?:$/i.test(u.protocol)) return badRequest('Only http(s) URLs supported');
    u.hash = '';
    normalized = u.toString();
  } catch {
    return badRequest('Invalid URL');
  }

  // Fetch with conservative headers
  const headers: Record<string, string> = {
    'user-agent': 'Mozilla/5.0 (compatible; LinkCrawlerBot/1.0; +https://example.invalid)',
    'accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
  };

  const resp = await fetch(normalized, { headers, redirect: 'follow' });
  if (!resp.ok) return upstreamError(resp.status, 'UPSTREAM_ERROR');

  const ctype = resp.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
  if (!ALLOWED_CONTENT_TYPES.has(ctype)) {
    return upstreamError(415, 'UNSUPPORTED_TYPE', 'Unsupported content-type');
  }

  // Stream through with safe headers and caching
  const outHeaders = new Headers();
  outHeaders.set('content-type', ctype);
  outHeaders.set('cache-control', 'public, max-age=86400');
  outHeaders.set('x-robots-tag', 'noindex');
  outHeaders.set('cross-origin-resource-policy', 'same-origin');
  outHeaders.set('referrer-policy', 'no-referrer');

  return new Response(resp.body, { status: 200, headers: outHeaders });
};

