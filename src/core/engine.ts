import { parseScaled } from "./scales";

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

export function oneInNToNumber(n: string | number, scales: Record<string, number>): number {
    if (typeof n === 'number') {
        return n;
    }
    return parseScaled(n, scales).value;
}

export function effectiveBaseRps(input: { rps?: string, speed?: string, bulk?: string }, mode: 'raw' | 'derived', scales: Record<string, number>): number {
    if (mode === 'raw') {
        return parseScaled(input.rps || '0', scales).value;
    }
    const speed = parseScaled(input.speed || '0', scales).value;
    const bulk = parseScaled(input.bulk || '0', scales).value;
    return speed * bulk;
}

export function shouldApplyLuck(rune: RuneRecord, luckRules: GameConfig['luckRules']): boolean {
    if (luckRules?.applyTo === 'all') {
        return !rune.tags?.includes('noluck');
    }
    if (luckRules?.applyTo === 'none') {
        return false;
    }
    // Default to 'known'
    if (rune.tags?.includes('secret') || rune.tags?.includes('noluck')) {
        return false;
    }
    return true;
}

export function etaSeconds(chanceN: number, baseRps: number, luckMultiplier: number, appliesLuck: boolean): number {
    if (baseRps <= 0) {
        return Infinity;
    }
    const effectiveRps = appliesLuck ? baseRps * luckMultiplier : baseRps;
    if (effectiveRps <= 0) {
        return Infinity;
    }
    return chanceN / effectiveRps;
}
