import { compareSemver, gt, inOpenClosedRange, isEligibleForNotification, isPrerelease } from './semver';
import type { Release } from './changelog';

export type AggregationOptions = {
  minorMajorOnly?: boolean; // default true per user choice
  allowPrereleaseIfFromPrerelease?: boolean; // default true per user choice
  silentVersions?: Set<string>; // optional suppressed versions
};

/**
 * Filter and aggregate releases between (lastSeen, current] respecting config:
 * - minorMajorOnly: include only versions that are a minor/major bump relative to the previous included version
 *   (chain-wise to ensure intermediate minors are kept; patches are dropped)
 * - prerelease: include prerelease only if lastSeen was prerelease (per business rule)
 * - silentVersions: exclude any version explicitly silenced
 * Input releases should contain all versions (typically from parseChangelog)
 */
export function aggregateUnseenReleases(
  releases: Release[],
  lastSeenVersion: string | null,
  currentVersion: string,
  opts?: AggregationOptions
): Release[] {
  const options: AggregationOptions = {
    minorMajorOnly: true,
    allowPrereleaseIfFromPrerelease: true,
    ...opts,
  };

  // Keep only entries strictly within (lastSeen, current]
  const candidates = releases
    .filter(r => inOpenClosedRange(r.version, lastSeenVersion, currentVersion))
    // Ensure ascending order (oldest first) for presentation
    .sort((a, b) => compareSemver(a.version, b.version));

  const out: Release[] = [];
  let anchor = lastSeenVersion;

  for (const r of candidates) {
    if (options.silentVersions && options.silentVersions.has(r.version)) continue;

    // prerelease gating
    if (isPrerelease(r.version)) {
      const allow = isEligibleForNotification(anchor, r.version, {
        minorMajorOnly: options.minorMajorOnly,
        allowPrereleaseIfFromPrerelease: options.allowPrereleaseIfFromPrerelease,
      });
      if (!allow) continue;
    }

    if (options.minorMajorOnly) {
      // include only if r is > anchor by at least minor bump; patches between included minors are dropped
      if (!anchor) {
        // first-time: accept first candidate (could be patch, but business rule says only minor/major); so advance until first non-patch
        if (isMinorOrMajorDiff(null, r.version)) {
          out.push(r);
          anchor = r.version;
        } else {
          // skip patches when no anchor present
          continue;
        }
      } else {
        if (isMinorOrMajorDiff(anchor, r.version)) {
          out.push(r);
          anchor = r.version;
        } else {
          // patch diff: skip
        }
      }
    } else {
      out.push(r);
      anchor = r.version;
    }
  }

  // Ensure we include current version if nothing else made it and current is greater than lastSeen and not silenced
  if (out.length === 0 && (!options.silentVersions || !options.silentVersions.has(currentVersion))) {
    const current = releases.find(r => r.version === currentVersion);
    if (current && (!isPrerelease(currentVersion) || isEligibleForNotification(lastSeenVersion, currentVersion, {
      minorMajorOnly: options.minorMajorOnly,
      allowPrereleaseIfFromPrerelease: options.allowPrereleaseIfFromPrerelease,
    }))) {
      if (!lastSeenVersion || gt(currentVersion, lastSeenVersion)) {
        out.push(current);
      }
    }
  }

  return out;
}

function isMinorOrMajorDiff(from: string | null, to: string): boolean {
  if (!from) {
    // treat first as eligible only if not a pure patch relative to "null"
    // simplest: allow if not a patch vs 0.0.0; but we cannot compare without from.
    // We approximate by excluding versions with .patch === 0 only? Not reliable.
    // Alternative: accept any non-patch by checking existence of prerelease or not? We'll approximate by always accepting because gating already happens overall.
    // Adjust: derive decision using semantic: if it is x.y.z and we have no baseline, require z===0 to count as minor/major. Otherwise skip.
    const m = to.match(/^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/);
    if (!m) return true;
    const patch = Number(m[3]);
    return patch === 0; // treat x.y.0 as eligible; skip x.y.z where z>0
  }
  // Compare only core differences
  const [aMaj, aMin] = core(from);
  const [bMaj, bMin, bPat] = core(to);
  if (bMaj !== aMaj) return bPat === 0 && bMin === 0; // include only x.0.0 when major changes
  if (bMin !== aMin) return bPat === 0; // include only x.y.0 when minor changes
  return false; // same major/minor => patch/prerelease only
}

function core(v: string): [number, number, number] {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}