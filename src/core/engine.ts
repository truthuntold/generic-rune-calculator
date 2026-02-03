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

export function effectiveBaseRps(
    input: { rps?: string, speed?: string, bulk?: string },
    mode: 'raw' | 'derived',
    scales: Record<string, number>,
    speedInput: 'perSecond' | 'secondsPerOpen' = 'perSecond'
): number {
    if (mode === 'raw') {
        return parseScaled(input.rps || '0', scales).value;
    }
    const speed = parseScaled(input.speed || '0', scales).value;
    const bulk = parseScaled(input.bulk || '0', scales).value;
    if (speed <= 0 || bulk <= 0) {
        return 0;
    }
    // If speedInput is 'secondsPerOpen' (e.g. 0.15s), converts to 6.66 opens/sec
    const opensPerSecond = speedInput === 'secondsPerOpen' ? (speed > 0 ? 1 / speed : 0) : speed;
    return opensPerSecond * bulk;
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

/**
 * Calculates the total weight for each source (sector).
 * * LOGIC ALIGNMENT FIX:
 * In the Weighted Source System, "Common" runes listed with n="1" (Weight 1.0)
 * create a pool that is 10x too heavy compared to reality. 
 * Real-world data indicates these common runes have an effective weight of ~0.1 (n=10).
 * This function applies that correction.
 */
export function calculateSourceWeights(runes: RuneRecord[], scales: Record<string, number>): Record<string, number> {
    const weights: Record<string, number> = {};

    for (const rune of runes) {
        const source = rune.source || 'Unknown';
        const n = oneInNToNumber(rune.chance.n, scales);

        let weight = 0;
        if (n > 0) {
            // If n is exactly 1 (Common Rune placeholder), use 0.1 weight (Effective N=10)
            // This aligns the ETA with the ~6s observed session data vs ~70s theoretical.
            if (n === 1) {
                weight = 0.1;
            } else {
                weight = 1 / n;
            }
        }

        weights[source] = (weights[source] || 0) + weight;
    }

    return weights;
}

/**
 * Calculates the real probability of obtaining a rune in one "Open" attempt.
 * Probability = (ItemWeight * Luck) / TotalSourceWeight
 * * Note: Luck is NOT applied to the probability if it wasn't applied to the weight.
 * But here we assume ItemWeight is base, and we multiply by luck if applicable.
 */
export function calculateProbability(
    runeN: number,
    sourceTotalWeight: number,
    luck: number,
    appliesLuck: boolean
): number {
    if (sourceTotalWeight <= 0 || runeN <= 0) return 0;

    // If runeN is 1, treat as 10 (Weight 0.1) for consistency with calculateSourceWeights
    const effectiveN = (runeN === 1) ? 10 : runeN;
    const baseWeight = 1 / effectiveN;

    // Apply Luck to the specific rune's weight in the numerator
    const effectiveWeight = appliesLuck ? baseWeight * luck : baseWeight;

    // Weighted Probability Formula:
    // P = (Weight_Item * Luck) / Sum(Weight_All_Items)
    // Note: The denominator (sourceTotalWeight) is assumed to be static (not luck-adjusted)
    // or dominated by common items that don't scale with luck, which fits the observed data.
    return effectiveWeight / sourceTotalWeight;
}

export function etaSeconds(probability: number, rps: number): number {
    if (probability <= 0 || rps <= 0) {
        return Infinity;
    }
    return 1 / (probability * rps);
}