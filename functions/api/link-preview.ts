// Cloudflare Pages Function: /api/link-preview
// Calls link-preview-js server-side to avoid CORS, returns sanitized JSON
// Endpoint: GET /api/link-preview?url=https://example.com

import { getLinkPreview } from "link-preview-js";

// Types for CF Pages Functions (keep loose to avoid extra dev deps)
export interface Env {
  // No env vars required
}

type PreviewData = {
  url: string;
  title?: string;
  description?: string;
  siteName?: string;
  images?: string[];
  mediaType?: string;
  favicon?: string;
};

type ErrorBody = { error: true; message: string; code?: string };

function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=300",
    "x-robots-tag": "noindex",
  });
  if (init?.headers) {
    const extra = new Headers(init.headers as HeadersInit);
    extra.forEach((v, k) => headers.set(k, v));
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

function badRequest(message: string, code?: string) {
  const body: ErrorBody = { error: true, message, code };
  return json(body, { status: 400, headers: { "x-error-code": code || "BAD_REQUEST" } });
}

function serverError(message = "Internal error", code?: string) {
  const body: ErrorBody = { error: true, message, code };
  return json(body, { status: 500, headers: { "x-error-code": code || "INTERNAL" } });
}

function sanitizeText(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.replace(/<[^>]*>/g, "").trim().slice(0, 2000) || undefined;
}

function sanitizeUrl(u: unknown): string | undefined {
  if (typeof u !== "string") return undefined;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/i.test(parsed.protocol)) return undefined;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function sanitizeArrayUrls(arr: unknown): string[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const out: string[] = [];
  for (const it of arr) {
    const s = sanitizeUrl(it);
    if (s) out.push(s);
  }
  return out.length ? out.slice(0, 5) : undefined;
}

export const onRequestGet = async (context: { request: Request; env: Env; params?: Record<string, string> }) => {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) return badRequest("Missing 'url' query parameter", "MISSING_URL");

    // Validate and normalize target URL
    let normalized: string;
    try {
      const u = new URL(target);
      if (!/^https?:$/i.test(u.protocol)) {
        return badRequest("Only http(s) URLs supported", "INVALID_URL");
      }
      u.hash = "";
      normalized = u.toString();
    } catch {
      return badRequest("Invalid URL", "INVALID_URL");
    }

    // Strategy: try fetch with Twitterbot UA first (commonly whitelisted).
    // Fall back to Googlebot if blocked, then to a modern Chrome UA.
    const TWITTERBOT_UA =
      "Twitterbot/1.0";
    const GOOGLEBOT_UA =
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    const CHROME_UA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

    const baseHeaders = {
      "accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      // Some servers check for accept-language; provide a neutral value
      "accept-language": "en-US,en;q=0.8",
    } as const;

    async function tryPreview(userAgent: string) {
      const headers: Record<string, string> = {
        ...baseHeaders,
        "user-agent": userAgent,
      };
      return getLinkPreview(normalized, {
        timeout: 8000,
        headers,
        followRedirects: "follow",
      } as any);
    }

    // Heuristic: HEAD check for non-HTML to short-circuit
    const likelyBinaryExt = /\.(?:png|jpe?g|gif|webp|svg|ico|pdf|zip|rar|7z|mp4|mp3|wav|avi|mov)(?:[?#].*)?$/i;
    const isBinaryByExt = likelyBinaryExt.test(new URL(normalized).pathname);
    const HEAD_TIMEOUT = 3000;
    const ctOk = (ct: string | null) => !!ct && /^(text\/html|application\/xhtml\+xml)/i.test(ct);
    if (isBinaryByExt) {
      return json({ url: normalized, note: "Non-HTML target" }, { status: 204, headers: { "x-error-code": "UNSUPPORTED_TYPE" } });
    }
    try {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), HEAD_TIMEOUT);
      const headRes = await fetch(normalized, { method: "HEAD", redirect: "follow", headers: baseHeaders as any, signal: ac.signal });
      clearTimeout(t);
      const ct = headRes.headers.get("content-type");
      if (ct && !ctOk(ct)) {
        return json({ url: normalized, note: "Unsupported content-type" }, { status: 204, headers: { "x-error-code": "UNSUPPORTED_TYPE" } });
      }
    } catch {
      // ignore HEAD errors; continue to preview attempts
    }

    // Perform preview fetch (server-side avoids browser CORS)
    let data: any;
    let uaUsed = TWITTERBOT_UA;

    try {
      data = await tryPreview(TWITTERBOT_UA);
    } catch (e1) {
      // backoff + jitter
      await new Promise(r => setTimeout(r, 100 + Math.floor(Math.random() * 150)));
      uaUsed = GOOGLEBOT_UA;
      try {
        data = await tryPreview(GOOGLEBOT_UA);
      } catch (e2) {
        await new Promise(r => setTimeout(r, 150 + Math.floor(Math.random() * 200)));
        uaUsed = CHROME_UA;
        data = await tryPreview(CHROME_UA);
      }
    }

    const body: PreviewData = {
      url: normalized,
      title: sanitizeText(data?.title),
      description: sanitizeText(data?.description),
      siteName: sanitizeText(data?.siteName || data?.site_name),
      images:
        sanitizeArrayUrls(data?.images) ||
        (sanitizeUrl(data?.image) ? [sanitizeUrl(data?.image)!] : undefined),
      mediaType: sanitizeText(data?.mediaType || data?.media_type),
      favicon: sanitizeUrl(data?.favicons?.[0] || data?.favicon),
    };

    // If nothing useful, respond with 204-like JSON including the UA used to help debugging
    if (!body.title && !body.description && !body.images?.length && !body.siteName) {
      return json({ ...body, note: "No preview metadata available", userAgentTried: uaUsed }, { status: 204, headers: { "x-error-code": "EMPTY_PREVIEW" } });
    }

    return json(body, { status: 200 });
  } catch (err: any) {
    // Distinguish timeouts vs general failures
    const msg = typeof err?.message === "string" ? err.message : "Preview fetch failed";
    const code =
      (err?.name === "AbortError" || /timeout/i.test(msg)) ? "TIMEOUT" : "FETCH_FAILED";
    return serverError(msg, code);
  }
};
