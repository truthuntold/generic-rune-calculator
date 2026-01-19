import { describe, it, expect } from 'vitest';
import { parseScaled, formatTimeHuman } from './scales';

const scales = {
  K: 1e3,
  M: 1e6,
  B: 1e9,
  T: 1e12,
  Qd: 1e15,
};

describe('parseScaled', () => {
  it('should parse numbers without suffixes', () => {
    expect(parseScaled('123', scales).value).toBe(123);
  });

  it('should parse numbers with suffixes', () => {
    expect(parseScaled('1k', scales).value).toBe(1000);
    expect(parseScaled('2.5M', scales).value).toBe(2.5e6);
  });

  it('should be case-insensitive', () => {
    expect(parseScaled('1k', scales).value).toBe(1000);
    expect(parseScaled('1K', scales).value).toBe(1000);
  });

  it('should handle large numbers', () => {
    expect(parseScaled('1Qd', scales).value).toBe(1e15);
  });

  it('should return a warning for invalid numbers', () => {
    expect(parseScaled('abc', scales).warning).toBe('Invalid number');
  });

  it('should handle whitespace', () => {
    expect(parseScaled('  1.5B  ', scales).value).toBe(1.5e9);
  });

  it('should prefer the longest matching suffix when multiple match', () => {
    const ambiguousScales = { ...scales, B: 1e9, BB: 1e10 };
    expect(parseScaled('1BB', ambiguousScales).value).toBe(1e10);
    expect(parseScaled('2BB', ambiguousScales).value).toBe(2e10);
  });

  it('should handle very large numbers without clamping', () => {
    const result = parseScaled('1e15', scales);
    expect(result.value).toBe(1e15);
    expect(result.warning).toBeUndefined();
  });
});

describe('formatTimeHuman', () => {
  it('should format seconds', () => {
    expect(formatTimeHuman(30)).toBe('30s');
  });

  it('should format minutes with seconds if under 5m', () => {
    expect(formatTimeHuman(150)).toBe('2m 30s');
  });

  it('should format minutes without seconds if over 5m', () => {
    expect(formatTimeHuman(330)).toBe('6m');
  });

  it('should format hours', () => {
    expect(formatTimeHuman(7200)).toBe('2h');
  });

  it('should format days', () => {
    expect(formatTimeHuman(172800)).toBe('2d');
  });
});
