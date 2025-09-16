/**
 * Minimal SemVer 2.0.0 utilities with prerelease support and range helpers.
 * Unit-testable pure functions.
 *
 * Supported:
 * - Parse: 1.2.3, 1.2.3-beta.1, 1.2.3+build, 1.2.3-beta.1+build.5
 * - Compare with proper precedence rules (prerelease < release)
 * - Helpers for bump classification (major/minor/patch), channel/prerelease detection
 * - Range-like checks for "is a > b" and "a in (b, c]"
 */

export type SemVer = {
  major: number;
  minor: number;
  patch: number;
  prerelease: (string | number)[];
  build: string[]; // ignored in precedence
};

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

export function parseSemver(input: string): SemVer | null {
  const s = input.trim();
  const m = SEMVER_RE.exec(s);
  if (!m) return null;
  const [, maj, min, pat, pre, build] = m;
  return {
    major: Number(maj),
    minor: Number(min),
    patch: Number(pat),
    prerelease: pre ? pre.split('.').map(coerceIdentifier) : [],
    build: build ? build.split('.') : [],
  };
}

function coerceIdentifier(id: string): string | number {
  if (/^\d+$/.test(id)) {
    // numeric identifiers must not include leading zeroes in canonical semver, but we accept and coerce
    return Number(id);
  }
  return id;
}

export function isValidSemver(input: string): boolean {
  return parseSemver(input) !== null;
}

export function compareSemver(a: string | SemVer, b: string | SemVer): number {
  const av = typeof a === 'string' ? parseSemver(a) : a;
  const bv = typeof b === 'string' ? parseSemver(b) : b;
  if (!av || !bv) throw new Error('Invalid semver compare input');

  if (av.major !== bv.major) return av.major - bv.major;
  if (av.minor !== bv.minor) return av.minor - bv.minor;
  if (av.patch !== bv.patch) return av.patch - bv.patch;

  // If main parts equal, handle prerelease precedence
  const apre = av.prerelease;
  const bpre = bv.prerelease;

  if (apre.length === 0 && bpre.length === 0) return 0;
  if (apre.length === 0) return 1; // release > prerelease
  if (bpre.length === 0) return -1;

  const len = Math.max(apre.length, bpre.length);
  for (let i = 0; i < len; i++) {
    const ai = apre[i];
    const bi = bpre[i];
    if (ai === undefined) return -1; // a has fewer identifiers - lower precedence
    if (bi === undefined) return 1;
    const c = comparePrereleaseId(ai, bi);
    if (c !== 0) return c;
  }
  return 0;
}

function comparePrereleaseId(a: string | number, b: string | number): number {
  const aNum = typeof a === 'number';
  const bNum = typeof b === 'number';
  if (aNum && bNum) return (a as number) - (b as number);
  if (aNum) return -1; // numerics have lower precedence than non-numeric? In SemVer: numeric identifiers have lower precedence than non-numeric? Actually rule: Numeric identifiers have lower precedence than non-numeric? The correct rule: when comparing two pre-release identifiers, numeric identifiers are compared numerically and have lower precedence than non-numeric identifiers. Therefore numeric < non-numeric.
  if (bNum) return 1;
  if (a === b) return 0;
  return String(a) < String(b) ? -1 : 1;
}

export function gt(a: string | SemVer, b: string | SemVer): boolean {
  return compareSemver(a, b) > 0;
}
export function gte(a: string | SemVer, b: string | SemVer): boolean {
  return compareSemver(a, b) >= 0;
}
export function lt(a: string | SemVer, b: string | SemVer): boolean {
  return compareSemver(a, b) < 0;
}
export function lte(a: string | SemVer, b: string | SemVer): boolean {
  return compareSemver(a, b) <= 0;
}
export function eq(a: string | SemVer, b: string | SemVer): boolean {
  return compareSemver(a, b) === 0;
}

export function isPrerelease(v: string | SemVer): boolean {
  const sv = typeof v === 'string' ? parseSemver(v) : v;
  if (!sv) return false;
  return sv.prerelease.length > 0;
}

export type BumpType = 'major' | 'minor' | 'patch' | 'none' | 'prerelease-diff';

export function classifyBump(from: string, to: string): BumpType {
  const a = parseSemver(from);
  const b = parseSemver(to);
  if (!a || !b) throw new Error('Invalid semver for bump classification');
  if (compareSemver(a, b) === 0) return 'none';
  if (a.major !== b.major) return 'major';
  if (a.minor !== b.minor) return 'minor';
  if (a.patch !== b.patch) return 'patch';
  // Same core but different prerelease
  return 'prerelease-diff';
}

/**
 * Whether to flag a version change for notifications under "minor/major only" rule.
 * - If to is prerelease: only eligible if from is also a prerelease channel (business rule).
 */
export function isEligibleForNotification(from: string | null, to: string, options?: { minorMajorOnly?: boolean; allowPrereleaseIfFromPrerelease?: boolean }): boolean {
  const minorMajorOnly = options?.minorMajorOnly ?? false;
  const allowPrereleaseIfFromPrerelease = options?.allowPrereleaseIfFromPrerelease ?? false;

  if (!from) {
    // first-time user: show if rule allows (minor/major only means: if we aggregate, at least one eligible exists; controller handles)
    // here we treat first-time as eligible; filtering of releases handled elsewhere
    if (minorMajorOnly) return true;
    return true;
  }
  const bump = classifyBump(from, to);
  if (minorMajorOnly) {
    // If target is a prerelease, apply prerelease gating regardless of bump type
    if (isPrerelease(to)) {
      return allowPrereleaseIfFromPrerelease ? isPrerelease(from) : false;
    }
    // Otherwise only notify on minor/major
    return bump === 'major' || bump === 'minor';
  }
  if (isPrerelease(to)) {
    return allowPrereleaseIfFromPrerelease ? isPrerelease(from) : false;
  }
  return true;
}

/**
 * Returns true if version x is within (from, to] interval.
 * - exclusive lower bound, inclusive upper bound
 */
export function inOpenClosedRange(x: string, fromExclusive: string | null, toInclusive: string): boolean {
  if (fromExclusive) {
    if (!(compareSemver(x, fromExclusive) > 0 && compareSemver(x, toInclusive) <= 0)) return false;
    return true;
  }
  return lte(x, toInclusive);
}