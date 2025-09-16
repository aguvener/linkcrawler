import { describe, expect, it } from 'vitest';
import {
  parseSemver,
  isValidSemver,
  compareSemver,
  gt,
  gte,
  lt,
  lte,
  eq,
  isPrerelease,
  classifyBump,
  inOpenClosedRange,
  isEligibleForNotification,
} from '../src/services/update/semver';

describe('semver.parse', () => {
  it('parses basic versions', () => {
    expect(parseSemver('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: [],
      build: [],
    });
  });

  it('parses prerelease and build', () => {
    expect(parseSemver('1.2.3-beta.1+build.5')?.prerelease).toEqual(['beta', 1]);
  });

  it('validates', () => {
    expect(isValidSemver('1.0.0')).toBe(true);
    expect(isValidSemver('01.0.0')).toBe(false);
    expect(isValidSemver('1.0')).toBe(false);
  });
});

describe('semver.compare', () => {
  it('compares core versions', () => {
    expect(compareSemver('1.2.3', '1.2.2')).toBeGreaterThan(0);
    expect(compareSemver('1.2.3', '1.3.0')).toBeLessThan(0);
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });

  it('release > prerelease', () => {
    expect(compareSemver('1.2.3', '1.2.3-beta.1')).toBeGreaterThan(0);
    expect(compareSemver('1.2.3-alpha', '1.2.3-beta')).toBeLessThan(0); // alpha < beta
  });

  it('numeric prerelease ids compare numerically and lower than non-numeric', () => {
    expect(compareSemver('1.2.3-1', '1.2.3-2')).toBeLessThan(0);
    expect(compareSemver('1.2.3-1', '1.2.3-a')).toBeLessThan(0);
  });

  it('helpers', () => {
    expect(gt('1.0.1', '1.0.0')).toBe(true);
    expect(gte('1.0.1', '1.0.1')).toBe(true);
    expect(lt('1.0.0', '1.0.1')).toBe(true);
    expect(lte('1.0.1', '1.0.1')).toBe(true);
    expect(eq('1.0.1', '1.0.1')).toBe(true);
  });
});

describe('semver.prerelease detection', () => {
  it('detects', () => {
    expect(isPrerelease('1.2.3-beta')).toBe(true);
    expect(isPrerelease('1.2.3')).toBe(false);
  });
});

describe('semver.classifyBump', () => {
  it('classifies correctly', () => {
    expect(classifyBump('1.2.3', '2.0.0')).toBe('major');
    expect(classifyBump('1.2.3', '1.3.0')).toBe('minor');
    expect(classifyBump('1.2.3', '1.2.4')).toBe('patch');
    expect(classifyBump('1.2.3-beta.1', '1.2.3-beta.2')).toBe('prerelease-diff');
    expect(classifyBump('1.2.3', '1.2.3')).toBe('none');
  });
});

describe('semver.range', () => {
  it('open-closed interval', () => {
    expect(inOpenClosedRange('1.2.0', '1.1.0', '1.2.0')).toBe(true);
    expect(inOpenClosedRange('1.1.0', '1.1.0', '1.2.0')).toBe(false);
    expect(inOpenClosedRange('1.0.5', null, '1.0.6')).toBe(true);
  });
});

describe('semver.notification eligibility', () => {
  it('minor/major only with prerelease gating', () => {
    expect(isEligibleForNotification('1.0.0', '1.1.0', { minorMajorOnly: true })).toBe(true);
    expect(isEligibleForNotification('1.0.0', '1.0.1', { minorMajorOnly: true })).toBe(false);
    expect(isEligibleForNotification('1.0.0', '1.1.0-beta', { minorMajorOnly: true, allowPrereleaseIfFromPrerelease: false })).toBe(false);
    expect(isEligibleForNotification('1.1.0-beta', '1.2.0-beta', { minorMajorOnly: true, allowPrereleaseIfFromPrerelease: true })).toBe(true);
  });
});