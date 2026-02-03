export interface ChangelogEntry {
    version: string;
    date?: string;
    changes: string[];
}

/**
 * Keep newest first.
 * Add entries here when you bump `package.json` version.
 */
export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '1.0.2',
        changes: [
            'Implemented weighted probability system for ETA calculations',
            'Added color to the rune cards to know at a glance where it comes from.',
        ],
    },
    {
        version: '1.0.1',
        changes: [
            'Added Rune Luck and Rune Speed potion toggles (each gives 2×).',
            'Added new secret runes in Energy and Basic.',
        ],
    },
    {
        version: '1.0.0',
        changes: [
            'Your settings now persist between visits (Speed/Bulk/Luck, Custom Calc, and filters).',
            'Added Heavenly Runes.',
            'Filled in a few missing runes.',
            'Added a Trello sync script to generate rune data updates on demand.',
        ],
    },
];

