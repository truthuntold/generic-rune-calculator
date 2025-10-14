import Ajv from 'ajv';
import gameConfigSchema from '../../schemas/game.config.schema.json';
import runesSchema from '../../schemas/runes.schema.json';

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

const RUNES_URL = import.meta.env.VITE_RUNES_URL || '/runes.json';
const SCALES_URL = import.meta.env.VITE_SCALES_URL || '/scales.json';
const GAME_CONFIG_URL = import.meta.env.VITE_GAME_CONFIG_URL || '/game.config.raw.json';

const ajv = new Ajv();

async function validate(data: any, schema: any, url: string) {
    if (import.meta.env.DEV) {
        const validate = ajv.compile(schema);
        const valid = validate(data);
        if (!valid) {
            console.error(`Validation failed for ${url}:`, validate.errors);
            throw new Error(`Invalid data from ${url}`);
        }
    }
}

export async function loadRunes(): Promise<RuneRecord[]> {
    const response = await fetch(RUNES_URL);
    if (!response.ok) {
        throw new Error(`Failed to load runes from ${RUNES_URL}`);
    }
    const data = await response.json();
    await validate(data, runesSchema, RUNES_URL);
    return data;
}

export async function loadScales(): Promise<Record<string, number>> {
    const response = await fetch(SCALES_URL);
    if (!response.ok) {
        throw new Error(`Failed to load scales from ${SCALES_URL}`);
    }
    return response.json();
}

export async function loadConfig(): Promise<GameConfig> {
    const response = await fetch(GAME_CONFIG_URL);
    if (!response.ok) {
        throw new Error(`Failed to load game config from ${GAME_CONFIG_URL}`);
    }
    const data = await response.json();
    await validate(data, gameConfigSchema, GAME_CONFIG_URL);
    return data;
}
