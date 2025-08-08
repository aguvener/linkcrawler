import { initializeStorage, getLastSeenVersion, setLastSeenVersion, hasSeenVersion, addSeenVersion, getSilentVersions, broadcastPing, onPing } from './versionStorage';
import { parseChangelog, type Release, renderReleaseSummary } from './changelog';
import { compareSemver, gt, isPrerelease } from './semver';
import { aggregateUnseenReleases, type AggregationOptions } from './aggregator';
import { marked } from 'marked';
import createDOMPurify, { type DOMPurify } from 'dompurify';

export type UpdateControllerConfig = {
  appVersion: string; // current app version
  changelogUrl?: string; // default: '/CHANGELOG.md'
  checkOnIntervalMs?: number; // optional periodic check
  minorMajorOnly?: boolean; // default true per user choice
  allowPrereleaseIfFromPrerelease?: boolean; // default true per user choice
  onShow: (payload: { releases: Release[]; html: string; versions: string[] }) => void; // provide UI hook
  onHide?: () => void;
  onError?: (error: unknown) => void;
};

export class UpdateController {
  private config: Required<Omit<UpdateControllerConfig, 'onHide' | 'onError'>> & Pick<UpdateControllerConfig, 'onHide' | 'onError'>;
  private timer: number | null = null;
  private disposed = false;
  private lastShownVersion: string | null = null;

  constructor(cfg: UpdateControllerConfig) {
    this.config = {
      changelogUrl: '/CHANGELOG.md',
      checkOnIntervalMs: 0,
      minorMajorOnly: true,
      allowPrereleaseIfFromPrerelease: true,
      ...cfg,
    };
  }

  async init(): Promise<void> {
    initializeStorage();
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('DEBUG: UpdateController init called. checkOnIntervalMs:', this.config.checkOnIntervalMs);
    }
    await this.checkAndMaybeShow();

    // Polling disabled: modal update will not refresh automatically

    // Multi-tab: listen for ping to hide if seen elsewhere
    onPing(() => {
      // If another tab marked the current version seen, and we have a modal open, instruct UI to hide.
      const lastSeen = getLastSeenVersion();
      if (this.lastShownVersion && lastSeen && compareSemver(lastSeen, this.lastShownVersion) >= 0) {
        this.config.onHide?.();
      }
    });
  }

  dispose(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.disposed = true;
  }

  async markCurrentSeen(): Promise<void> {
    const v = this.config.appVersion;
    addSeenVersion(v);
    // Maintain monotonic lastSeenVersion if upgrade; guard downgrades
    const lastSeen = getLastSeenVersion();
    if (!lastSeen || compareSemver(v, lastSeen) > 0) {
      setLastSeenVersion(v);
    }
    this.lastShownVersion = null;
    broadcastPing();
  }

  private async checkAndMaybeShow(): Promise<void> {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('DEBUG: checkAndMaybeShow started.');
    }
    if (this.disposed) return;
    const current = this.config.appVersion;
    const lastSeen = getLastSeenVersion();

    // If downgrade detected, do not show, but do not overwrite lastSeen
    if (lastSeen && compareSemver(current, lastSeen) < 0) {
      return;
    }

    // If already seen this exact version, skip
    if (hasSeenVersion(current)) {
      return;
    }

    // Fetch changelog text
    let md = '';
    try {
      const res = await fetch(this.config.changelogUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch CHANGELOG.md: ${res.status}`);
      md = await res.text();
    } catch (err) {
      // Fallback generic modal
      const html = this.renderGeneric(current);
      this.lastShownVersion = current;
      this.config.onShow({ releases: [], html, versions: [current] });
      return;
    }

    // Parse and aggregate
    let releases: Release[] = [];
    try {
      releases = parseChangelog(md);
    } catch (err) {
      const html = this.renderGeneric(current);
      this.lastShownVersion = current;
      this.config.onShow({ releases: [], html, versions: [current] });
      return;
    }

    const options: AggregationOptions = {
      minorMajorOnly: this.config.minorMajorOnly,
      allowPrereleaseIfFromPrerelease: this.config.allowPrereleaseIfFromPrerelease,
      silentVersions: getSilentVersions(),
    };

    const unseen = aggregateUnseenReleases(releases, lastSeen, current, options);
    if (unseen.length === 0) {
      // nothing to show
      return;
    }

    // Build HTML content for modal
    const html = this.renderHtmlForReleases(unseen);
    const versions = unseen.map(r => r.version);

    this.lastShownVersion = current;
    this.config.onShow({ releases: unseen, html, versions });
  }

  private renderGeneric(current: string): string {
    return `
      <div class="update-modal-content">
        <h2 class="update-title">What’s new in v${current}</h2>
        <p>Your app has been updated to version <strong>${current}</strong>.</p>
      </div>
    `.trim();
  }

  private renderHtmlForReleases(releases: Release[]): string {
    // Configure marked once
    marked.setOptions({
      breaks: true,
      gfm: true
    });

    // Helper to synthesize markdown with headings and lists from structured sections
    const toMarkdown = (r: Release): string => {
      const lines: string[] = [];
      // Remove redundant h2 header since summary already shows version
      
      const order = ['Added', 'Changed', 'Fixed', 'Deprecated', 'Removed', 'Security', 'Maintenance'];
      let any = false;
      for (const key of order) {
        const items = r.sections[key];
        if (items && items.length) {
          any = true;
          lines.push(`### ${key}`);
          for (const it of items) {
            lines.push(/^\s*[-*+]\s+/.test(it) ? it : `- ${it}`);
          }
          lines.push('');
        }
      }

      if (!any) {
        // Fallback to rawBody or summary if no structured sections
        const raw = r.rawBody?.trim() ? r.rawBody : renderReleaseSummary(r);
        lines.push(raw);
      }

      return lines.join('\n').trim();
    };

    // Newest first listing, collapsible
    const sections = [...releases]
      .sort((a, b) => compareSemver(b.version, a.version))
      .map((r, idx) => {
        const md = toMarkdown(r);
        const rendered = marked.parse(md);
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('DEBUG: Marked.parse output (rendered):', rendered);
        }

        // Sanitize with a DOMPurify instance bound to globalThis for browser runtime
        const purifier = createDOMPurify(globalThis as unknown as Window & typeof globalThis);
        const safe = purifier.sanitize(typeof rendered === 'string' ? rendered : String(rendered));
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('DEBUG: DOMPurify sanitized output (safe):', safe);
        }

        const open = idx === 0 ? ' open' : '';
        const detailsHtml = `
<details class="update-release"${open}>
  <summary>Version v${escapeHtml(r.version)}${r.date ? ` - ${escapeHtml(r.date)}` : ''}</summary>
  <div class="update-release-body markdown-body">
    ${safe}
  </div>
</details>`.trim();
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log('DEBUG: Final details HTML structure:', detailsHtml);
        }
        return detailsHtml;
      })
      .join('\n');

    const latest = [...releases].sort((a, b) => compareSemver(b.version, a.version))[0]?.version;
    
    return `
<div class="update-modal-content">
  <h2 class="update-title">What's new up to v${escapeHtml(latest || '')}</h2>
  ${sections}
</div>`.trim();
  }
}

function escapeHtml(s: string): string {
  // Minimal escape for values interpolated into HTML attributes/text nodes
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}