/**
 * CHANGELOG.md parser (Keep a Changelog style).
 * Parses versions, dates, and standard sections: Added, Changed, Fixed, Deprecated, Removed, Security.
 * Robust to markdown noise; falls back gracefully.
 */

import { compareSemver } from './semver';

export type ReleaseSections = {
  Added?: string[];
  Changed?: string[];
  Fixed?: string[];
  Deprecated?: string[];
  Removed?: string[];
  Security?: string[];
  [key: string]: string[] | undefined; // allow custom sections while preserving known ones
};

export type Release = {
  version: string;
  date?: string | null;
  sections: ReleaseSections;
  rawBody: string; // full markdown body for this release
};

const VERSION_HEADING_RE = /^##\s*\[?([0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?)\]?(?:\s*-\s*([0-9]{4}-[0-9]{2}-[0-9]{2}))?\s*$/i;
const SECTION_HEADING_RE = /^###\s+([A-Za-z][A-Za-z ]+)\s*$/;
const LIST_ITEM_RE = /^[-*+]\s+(.*)$/;

/**
 * Parse a Keep a Changelog-like markdown string into an array of Release entries.
 * Older releases should appear later in the file; we preserve the file order.
 */
export function parseChangelog(markdown: string): Release[] {
  const lines = markdown.split(/\r?\n/);
  const releases: Release[] = [];

  let i = 0;
  // Skip intro until first "## ..." version heading
  while (i < lines.length && !VERSION_HEADING_RE.test(lines[i])) i++;

  while (i < lines.length) {
    const headerMatch = lines[i].match(VERSION_HEADING_RE);
    if (!headerMatch) {
      i++;
      continue;
    }
    const version = headerMatch[1];
    const date = headerMatch[2] ?? null;
    i++;

    // Collect body until next version heading or EOF
    const start = i;
    while (i < lines.length && !VERSION_HEADING_RE.test(lines[i])) i++;
    const bodyLines = lines.slice(start, i);

    const { sections, rawBody } = parseSections(bodyLines);
    releases.push({ version, date, sections, rawBody });
  }

  // Sort releases in descending semver order to simplify consumers, but preserve markdown chronological intent if needed.
  releases.sort((a, b) => compareSemver(b.version, a.version));
  return releases;
}

function parseSections(lines: string[]): { sections: ReleaseSections; rawBody: string } {
  const sections: ReleaseSections = {};
  let currentSection: string | null = null;
  const rawBody = lines.join('\n').trim();

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    const sectionMatch = line.match(SECTION_HEADING_RE);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      if (!sections[currentSection]) sections[currentSection] = [];
      continue;
    }

    // Collect list items under the current section
    const itemMatch = line.match(LIST_ITEM_RE);
    if (itemMatch && currentSection) {
      const content = itemMatch[1].trim();
      (sections[currentSection] as string[]).push(content);
      continue;
    }

    // Blank lines or paragraphs are ignored for structured sections; retained in rawBody.
  }

  return { sections, rawBody };
}

/**
 * Utility to render a release to a simplified string (for fallback modal text)
 */
export function renderReleaseSummary(r: Release): string {
  const parts: string[] = [];
  parts.push(`v${r.version}${r.date ? ` - ${r.date}` : ''}`);
  const keys = ['Added', 'Changed', 'Fixed', 'Deprecated', 'Removed', 'Security'];
  for (const k of keys) {
    const items = r.sections[k];
    if (items && items.length) {
      parts.push(`• ${k}:`);
      for (const it of items) {
        parts.push(`  - ${it}`);
      }
    }
  }
  return parts.join('\n');
}