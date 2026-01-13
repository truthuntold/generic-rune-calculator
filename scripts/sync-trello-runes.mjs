import Ajv from 'ajv';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

import {
    parseRuneLine,
    selectCardsBetweenMarkers,
    slugifyId,
} from './sync-trello-runes-lib.mjs';

const DEFAULT_TRELLO_URL = 'https://api.trello.com/1/lists/68c4f3e006dbefa9669917d1/cards';
const DEFAULT_INPUT_FILE = 'scripts/data/trello_example.json';
const DEFAULT_OUTPUT_FILE = 'public/runes.json';
const RUNES_SCHEMA_FILE = 'schemas/runes.schema.json';

function printHelp() {
    // Keep help short: this is a util script.
    console.log(`
Sync runes from Trello card descriptions into public/runes.json.

Usage:
  node scripts/sync-trello-runes.mjs
  node scripts/sync-trello-runes.mjs --input scripts/data/trello_example.json
  node scripts/sync-trello-runes.mjs --dry-run

Options:
  --url <url>       Trello endpoint (default: list cards URL)
  --input <path>    Read cards JSON from file instead of fetching
  --output <path>   Target runes.json path (default: public/runes.json)
  --dry-run         Do not write; only print a summary
  --help            Show this help
`);
}

function parseArgs(argv) {
    const args = {
        url: DEFAULT_TRELLO_URL,
        input: null,
        output: DEFAULT_OUTPUT_FILE,
        dryRun: false,
        help: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') args.help = true;
        else if (a === '--dry-run') args.dryRun = true;
        else if (a === '--url') args.url = argv[++i];
        else if (a === '--input') args.input = argv[++i];
        else if (a === '--output') args.output = argv[++i];
        else {
            throw new Error(`Unknown arg: ${a}`);
        }
    }
    return args;
}

async function loadCards({ url, input }) {
    if (input) {
        const p = resolve(input);
        return JSON.parse(readFileSync(p, 'utf-8'));
    }
    const u = new URL(url);
    // Ask only for fields we need; Trello will ignore unknowns if not supported.
    if (!u.searchParams.has('fields')) u.searchParams.set('fields', 'name,desc,pos');
    const res = await fetch(u.toString(), { headers: { Accept: 'application/json' } });
    if (!res.ok) {
        throw new Error(`Fetch failed (${res.status}) ${res.statusText}`);
    }
    return res.json();
}

function loadRunes(outputPath) {
    const p = resolve(outputPath);
    return JSON.parse(readFileSync(p, 'utf-8'));
}

function validateRunes(runes) {
    const schema = JSON.parse(readFileSync(resolve(RUNES_SCHEMA_FILE), 'utf-8'));
    const ajv = new Ajv();
    const validate = ajv.compile(schema);
    const valid = validate(runes);
    if (!valid) {
        console.error('Validation failed for runes.json:');
        console.error(validate.errors);
        return false;
    }
    return true;
}

function normalizeTagsForCompare(tags) {
    if (!tags || tags.length === 0) return undefined;
    return tags;
}

function runeEqualsFields(a, b) {
    if (!a || !b) return false;
    if (a.name !== b.name) return false;
    if ((a.source ?? undefined) !== (b.source ?? undefined)) return false;
    if (a.chance?.type !== b.chance?.type) return false;
    if (a.chance?.n !== b.chance?.n) return false;

    const ta = normalizeTagsForCompare(a.tags);
    const tb = normalizeTagsForCompare(b.tags);
    if (ta === undefined && tb === undefined) return true;
    if (!Array.isArray(ta) || !Array.isArray(tb)) return false;
    if (ta.length !== tb.length) return false;
    for (let i = 0; i < ta.length; i++) {
        if (ta[i] !== tb[i]) return false;
    }
    return true;
}

function mergeRunes(existingRunes, parsedRunes) {
    const byId = new Map();
    const byNameLower = new Map();

    for (let i = 0; i < existingRunes.length; i++) {
        const r = existingRunes[i];
        if (r?.id) byId.set(r.id, { index: i, rune: r });
        if (r?.name) byNameLower.set(String(r.name).toLowerCase(), { index: i, rune: r });
    }

    let updated = 0;
    let added = 0;

    for (const pr of parsedRunes) {
        const nameLower = String(pr.name).toLowerCase();
        const existingById = pr.id ? byId.get(pr.id) : null;
        const existingByName = byNameLower.get(nameLower);

        if (existingById) {
            const idx = existingById.index;
            const before = existingRunes[idx];
            const next = { ...before, ...pr };
            // Normalize empty tags to undefined (matches optional schema field).
            if (!next.tags || next.tags.length === 0) delete next.tags;
            existingRunes[idx] = next;
            if (!runeEqualsFields(before, next)) updated++;
            continue;
        }

        if (existingByName) {
            const idx = existingByName.index;
            const before = existingRunes[idx];
            const next = { ...before, ...pr, id: before.id };
            if (!next.tags || next.tags.length === 0) delete next.tags;
            existingRunes[idx] = next;
            if (!runeEqualsFields(before, next)) updated++;
            continue;
        }

        const next = { ...pr };
        if (!next.tags || next.tags.length === 0) delete next.tags;
        existingRunes.push(next);
        added++;
    }

    return { updated, added };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }

    const cards = await loadCards(args);
    if (!Array.isArray(cards)) {
        throw new Error('Expected Trello response to be an array of cards');
    }

    const windowCards = selectCardsBetweenMarkers(cards, 'Main', 'Shop');

    const parsedRunes = [];
    let skippedLines = 0;

    // Parse cards in list order; parse lines top-to-bottom.
    for (const card of windowCards) {
        const source = `${card.name} Rune`;
        const lines = String(card.desc || '').split(/\r?\n/);
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            const parsed = parseRuneLine(line);
            if (!parsed) {
                skippedLines++;
                continue;
            }
            const id = slugifyId(parsed.name);
            parsedRunes.push({
                id,
                name: parsed.name,
                chance: parsed.chance,
                source,
                tags: parsed.tags,
            });
        }
    }

    // Deduplicate parsed runes deterministically: last wins.
    const lastById = new Map();
    for (const r of parsedRunes) lastById.set(r.id, r);
    const parsedUnique = [...lastById.values()];

    const existingRunes = loadRunes(args.output);
    if (!Array.isArray(existingRunes)) {
        throw new Error(`Expected ${args.output} to be an array`);
    }

    const beforeCount = existingRunes.length;
    const { updated, added } = mergeRunes(existingRunes, parsedUnique);
    const afterCount = existingRunes.length;

    console.log(
        [
            `cardsProcessed=${windowCards.length}`,
            `runesParsed=${parsedRunes.length}`,
            `runesUnique=${parsedUnique.length}`,
            `updated=${updated}`,
            `added=${added}`,
            `skippedLines=${skippedLines}`,
            `count:${beforeCount}->${afterCount}`,
        ].join(' ')
    );

    if (args.dryRun) {
        console.log('dry-run: no files written');
        return;
    }

    const outPath = resolve(args.output);
    writeFileSync(outPath, JSON.stringify(existingRunes, null, 2) + '\n', 'utf-8');

    if (!validateRunes(existingRunes)) {
        process.exitCode = 1;
        return;
    }
    console.log('OK: wrote and validated', args.output);
}

main().catch(err => {
    console.error(err?.stack || String(err));
    process.exitCode = 1;
});


