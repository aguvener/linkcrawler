/**
 * Proxy-based fetcher targeting Cloudflare Pages Functions endpoint /api/link-preview.
 * The server-side function uses link-preview-js and returns sanitized JSON.
 * We keep client-side sanitization as a defense-in-depth.
 */
import type { PreviewResult, PreviewData, PreviewError } from "./previewCache";

const API_ENDPOINT = "/api/link-preview";

function sanitizeText(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  // Robust text sanitizer: normalize, decode entities once, then escape all HTML
  // 1) Unicode normalization to NFKC to collapse multi-codepoint forms
  let s: string = (typeof (v as any).normalize === "function") ? (v as string).normalize("NFKC") : (v as string);
  // 2) Decode common HTML entities once (limited safe set)
  const entityMap: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
  };
  s = s.replace(/&(#(?:\d+)|#x(?:[0-9a-fA-F]+)|[a-zA-Z][a-zA-Z0-9]+);/g, (_m, g1: string) => {
    if (!g1) return _m;
    if (g1[0] === "#") {
      try {
        const isHex = g1[1]?.toLowerCase() === "x";
        const num = isHex ? parseInt(g1.slice(2), 16) : parseInt(g1.slice(1), 10);
        if (!Number.isFinite(num) || num < 0) return _m;
        return String.fromCodePoint(num);
      } catch {
        return _m;
      }
    }
    const key = g1.toLowerCase();
    return Object.prototype.hasOwnProperty.call(entityMap, key) ? entityMap[key] : _m;
  });
  // 3) Escape all HTML special chars so no markup can survive
  // Order matters: escape ampersand first to avoid double-encoding
  s = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  // Trim and bound length
  s = s.trim().slice(0, 2000);
  return s || undefined;
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
  const cleaned: string[] = [];
  for (const item of arr) {
    const s = sanitizeUrl(item);
    if (s) cleaned.push(s);
  }
  return cleaned.length ? cleaned.slice(0, 5) : undefined;
}

function toError(message: string, code?: string): PreviewError {
  return { error: true, message, code };
}

export type FetchPreviewOptions = {
  timeoutMs?: number; // fetch timeout
};

export async function fetchPreviewClientOnly(url: string, options: FetchPreviewOptions = {}): Promise<PreviewResult> {
  if (typeof window === "undefined") {
    return toError("Preview unavailable on server", "SSR_GUARD");
  }

  // Basic URL sanitization
  let safeUrl: string;
  try {
    const u = new URL(url);
    if (!/^https?:$/i.test(u.protocol)) {
      return toError("Only http(s) URLs supported", "INVALID_URL");
    }
    u.hash = "";
    safeUrl = u.toString();
  } catch {
    return toError("Invalid URL", "INVALID_URL");
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(1, options.timeoutMs ?? 8000);
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_ENDPOINT}?url=${encodeURIComponent(safeUrl)}`, {
      method: "GET",
      headers: { "accept": "application/json" },
      signal: controller.signal,
    });

    if (!res.ok && res.status !== 204) {
      return toError(`Proxy error ${res.status}`, res.status === 400 ? "INVALID_URL" : "PROXY_ERROR");
    }

    if (res.status === 204) {
      // No content-like response
      return toError("No preview metadata available", "EMPTY_PREVIEW");
    }

    const data = await res.json();

    const preview: PreviewData = {
      url: sanitizeUrl(data?.url) ?? safeUrl,
      title: sanitizeText(data?.title),
      description: sanitizeText(data?.description),
      siteName: sanitizeText(data?.siteName || data?.site_name),
      images: sanitizeArrayUrls(data?.images) || (sanitizeUrl(data?.image) ? [sanitizeUrl(data?.image)!] : undefined),
      mediaType: sanitizeText(data?.mediaType || data?.media_type),
      favicon: sanitizeUrl(data?.favicon || data?.favicons?.[0]),
    };

    if (!preview.title && !preview.description && !preview.images?.length && !preview.siteName) {
      return toError("No preview metadata available", "EMPTY_PREVIEW");
    }
    return preview;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      return toError("Preview request timed out", "TIMEOUT");
    }
    return toError("Failed to fetch preview via proxy", "FETCH_FAILED");
  } finally {
    window.clearTimeout(timer);
  }
}
