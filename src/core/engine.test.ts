import { describe, it, expect } from 'vitest';
import { oneInNToNumber, effectiveBaseRps, shouldApplyLuck, etaSeconds, calculateProbability } from './engine';

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

  it('should handle secondsPerOpen speed input', () => {
    // 0.25 seconds per open -> 4 per second; bulk 2 -> 8 rps
    expect(effectiveBaseRps({ speed: '0.25', bulk: '2' }, 'derived', scales, 'secondsPerOpen')).toBe(8);
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

describe('calculateProbability', () => {
  it('should calculate probability correctly without luck', () => {
    // 1/1000 chance, total weight 1 (placeholder for isolated calculation), luck 2 (ignored), appliesLuck false
    // Weight = 0.001. Prob = 0.001 / 1 = 0.001
    expect(calculateProbability(1000, 1, 2, false)).toBe(0.001);
  });

  it('should calculate probability correctly with luck', () => {
    // 1/1000 chance, total weight 1, luck 2, appliesLuck true
    // BaseWeight = 0.001. EffectiveWeight = 0.002. Prob = 0.002 / 1 = 0.002
    expect(calculateProbability(1000, 1, 2, true)).toBe(0.002);
  });
});

describe('etaSeconds', () => {
  it('should calculate ETA from probability and RPS', () => {
    // Prob 0.1, RPS 1 -> 1 / 0.1 = 10s
    expect(etaSeconds(0.1, 1)).toBe(10);
    // Prob 0.01, RPS 100 -> 1 / 1 = 1s
    expect(etaSeconds(0.01, 100)).toBe(1);
  });

  it('should return Infinity for non-positive RPS or Probability', () => {
    expect(etaSeconds(0.1, 0)).toBe(Infinity);
    expect(etaSeconds(0, 10)).toBe(Infinity);
    expect(etaSeconds(0.1, -10)).toBe(Infinity);
  });
});
