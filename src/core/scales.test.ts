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

  it('should return a warning for ambiguous suffixes', () => {
    const ambiguousScales = { ...scales, B: 1e9, BB: 1e10 };
    expect(parseScaled('1BB', ambiguousScales).warning).toBe('Ambiguous suffix. Matched: B, BB');
  });

  it('should handle overflow', () => {
    const result = parseScaled('1e100', scales);
    expect(result.value).toBe(Number.MAX_SAFE_INTEGER);
    expect(result.warning).toBe('Input exceeds maximum safe integer');
  });
});

describe('formatTimeHuman', () => {
  it('should format seconds', () => {
    expect(formatTimeHuman(30)).toBe('30s');
  });

  it('should format minutes', () => {
    expect(formatTimeHuman(150)).toBe('3m');
  });

  it('should format hours', () => {
    expect(formatTimeHuman(7200)).toBe('2h');
  });

  it('should format days', () => {
    expect(formatTimeHuman(172800)).toBe('2d');
  });
});
