import { describe, it, expect } from 'vitest';
import { oneInNToNumber, effectiveBaseRps, shouldApplyLuck, etaSeconds } from './engine';

export type RpsMode = 'raw' | 'derived';

export interface GameConfig {
  displayName?: string;
  rpsMode: RpsMode;
  labels?: Partial<Record<'rps' | 'speed' | 'bulk' | 'luck', string>>;
  defaults?: Partial<Record<'rps' | 'speed' | 'bulk' | 'luck', string>>;
  luckRules?: { applyTo?: 'known' | 'all' | 'none' }; // default 'known'
}

export interface ProbabilityOneInN {
  type: 'oneInN';
  n: string | number; // supports huge values, possibly suffixed (e.g., "1Qd")
}

export interface RuneRecord {
  id: string;
  name: string;
  chance: ProbabilityOneInN;
  source?: string;     // where to get it
  tags?: string[];     // e.g., ["secret"], ["noluck"]
}

const scales = {
  M: 1e6,
};

describe('oneInNToNumber', () => {
  it('should handle numbers', () => {
    expect(oneInNToNumber(100, scales)).toBe(100);
  });

  it('should handle scaled strings', () => {
    expect(oneInNToNumber('1M', scales)).toBe(1e6);
  });
});

describe('effectiveBaseRps', () => {
  it('should calculate raw RPS', () => {
    expect(effectiveBaseRps({ rps: '10' }, 'raw', scales)).toBe(10);
  });

  it('should calculate derived RPS', () => {
    expect(effectiveBaseRps({ speed: '2', bulk: '5' }, 'derived', scales)).toBe(10);
  });
});

describe('shouldApplyLuck', () => {
  const rune: RuneRecord = { id: 'test', name: 'Test', chance: { type: 'oneInN', n: 100 } };

  it('should apply luck by default to known runes', () => {
    expect(shouldApplyLuck(rune, {})).toBe(true);
  });

  it('should not apply luck to secret runes by default', () => {
    const secretRune = { ...rune, tags: ['secret'] };
    expect(shouldApplyLuck(secretRune, {})).toBe(false);
  });

  it('should not apply luck when noluck tag is present', () => {
    const noLuckRune = { ...rune, tags: ['noluck'] };
    expect(shouldApplyLuck(noLuckRune, {})).toBe(false);
  });

  it('should apply luck to all runes when configured', () => {
    const secretRune = { ...rune, tags: ['secret'] };
    const luckRules: GameConfig['luckRules'] = { applyTo: 'all' };
    expect(shouldApplyLuck(secretRune, luckRules)).toBe(true);
  });

  it('should not apply luck to any rune when configured', () => {
    const luckRules: GameConfig['luckRules'] = { applyTo: 'none' };
    expect(shouldApplyLuck(rune, luckRules)).toBe(false);
  });
});

describe('etaSeconds', () => {
  it('should calculate ETA without luck', () => {
    expect(etaSeconds(1000, 100, 2, false)).toBe(10);
  });

  it('should calculate ETA with luck', () => {
    expect(etaSeconds(1000, 100, 2, true)).toBe(5);
  });

  it('should return Infinity for non-positive RPS', () => {
    expect(etaSeconds(1000, 0, 2, true)).toBe(Infinity);
    expect(etaSeconds(1000, -10, 2, true)).toBe(Infinity);
  });
});
