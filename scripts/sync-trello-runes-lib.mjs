/**
 * Shared helpers for syncing Trello rune card descriptions into runes.json.
 * Intentionally dependency-free so it can be used by both the CLI and tests.
 */

/**
 * Create a stable rune id from a display name.
 * Example: "Garden Tree" -> "garden_tree"
 */
export function slugifyId(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
}

/**
 * Normalize Trello "1/<n>" right-hand side into the schema's `n` (string|number).
 * - Keep suffixes like "25B", "17.5Qn", "10TDe" as strings.
 * - Parse plain numbers like "1.54" as numbers.
 */
export function normalizeChanceN(raw) {
    const t = String(raw || '').trim();
    if (!t) return 0;
    if (/[a-zA-Z]/.test(t)) return t;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Split effects into tags.
 * Supports:
 * - pipe delimiters: "a | b | c"
 * - comma delimiters used like pipes: "a, b, +c" (only splits when comma is followed by x or +)
 * - stray backslashes used like delimiters: "a \\ b"
 */
export function splitTags(effectsRaw) {
    let s = String(effectsRaw || '').trim();
    if (!s) return [];

    // Normalize "\" / "\\" into a pipe delimiter when used as a separator.
    s = s.replace(/\s*\\+\s*/g, ' | ');

    const pipeParts = s.split('|').map(p => p.trim()).filter(Boolean);
    const tags = [];

    for (const part of pipeParts) {
        const commaParts = part
            .split(/,\s*(?=[x+])/g)
            .map(p => p.trim())
            .filter(Boolean);
        tags.push(...commaParts);
    }

    return tags;
}

/**
 * Parse a single rune line.
 * Example:
 *   "Arkanix 1/25B - x0.0005 Power | x0.000015 Charge"
 */
export function parseRuneLine(line) {
    const text = String(line || '').trim();
    if (!text) return null;

    // Allow hyphen, en dash, em dash.
    const re = /^(?<name>.+?)\s+1\/(?<n>[^\s]+)\s+[–—-]\s+(?<effects>.+)$/;
    const m = text.match(re);
    if (!m?.groups) return null;

    const name = m.groups.name.trim();
    const n = normalizeChanceN(m.groups.n);
    const tags = splitTags(m.groups.effects);

    return {
        name,
        chance: { type: 'oneInN', n },
        tags,
    };
}

/**
 * Return cards strictly between start and end markers, in Trello list order.
 */
export function selectCardsBetweenMarkers(cards, startName = 'Main', endName = 'Shop') {
    const sorted = [...(cards || [])].sort((a, b) => (a?.pos ?? 0) - (b?.pos ?? 0));
    const startIndex = sorted.findIndex(c => c?.name === startName);
    if (startIndex === -1) {
        throw new Error(`Marker card "${startName}" not found`);
    }
    const endIndex = sorted.findIndex((c, idx) => idx > startIndex && c?.name === endName);
    if (endIndex === -1) {
        throw new Error(`Marker card "${endName}" not found after "${startName}"`);
    }
    return sorted.slice(startIndex + 1, endIndex);
}


