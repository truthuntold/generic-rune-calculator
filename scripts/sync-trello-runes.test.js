import { describe, expect, it } from 'vitest';

import {
  normalizeChanceN,
  parseRuneLine,
  selectCardsBetweenMarkers,
  slugifyId,
  splitTags,
} from './sync-trello-runes-lib.mjs';

describe('sync-trello-runes-lib', () => {
  it('slugifyId matches existing conventions', () => {
    expect(slugifyId('Garden Tree')).toBe('garden_tree');
    expect(slugifyId('  500k Noob  ')).toBe('500k_noob');
  });

  it('normalizeChanceN keeps suffixed values as strings', () => {
    expect(normalizeChanceN('25B')).toBe('25B');
    expect(normalizeChanceN('17.5Qn')).toBe('17.5Qn');
    expect(normalizeChanceN('10TDe')).toBe('10TDe');
  });

  it('normalizeChanceN parses plain numbers', () => {
    expect(normalizeChanceN('1.54')).toBeCloseTo(1.54);
    expect(normalizeChanceN('100')).toBe(100);
  });

  it('parseRuneLine parses pipe-delimited effects', () => {
    const line =
      'Arkanix 1/25B - x0.0005 Power | x0.000015 Charge | x0.000002 Tech Points (x50 max)';
    const parsed = parseRuneLine(line);
    expect(parsed).not.toBeNull();
    expect(parsed.name).toBe('Arkanix');
    expect(parsed.chance).toEqual({ type: 'oneInN', n: '25B' });
    expect(parsed.tags).toEqual([
      'x0.0005 Power',
      'x0.000015 Charge',
      'x0.000002 Tech Points (x50 max)',
    ]);
  });

  it('parseRuneLine parses decimal odds', () => {
    const parsed = parseRuneLine('Common 1/1.54 - x0.01 Seeds');
    expect(parsed.chance).toEqual({ type: 'oneInN', n: 1.54 });
    expect(parsed.tags).toEqual(['x0.01 Seeds']);
  });

  it('parseRuneLine supports lines without dash (effects start with |)', () => {
    const parsed = parseRuneLine('The Unknown 1/25DDe | x500 Neptunite | x0.05 Plutite');
    expect(parsed).not.toBeNull();
    expect(parsed.name).toBe('The Unknown');
    expect(parsed.chance).toEqual({ type: 'oneInN', n: '25DDe' });
    expect(parsed.tags).toEqual(['x500 Neptunite', 'x0.05 Plutite']);
  });

  it('splitTags handles comma-delimited effects used as delimiters', () => {
    const tags = splitTags('x75 Cookies, x0.75 Santa Damage, +1 Christmas Bulk (+25 max)');
    expect(tags).toEqual(['x75 Cookies', 'x0.75 Santa Damage', '+1 Christmas Bulk (+25 max)']);
  });

  it('splitTags treats stray backslashes as delimiters', () => {
    const tags = splitTags('x50qd Santa Damage \\ x200m Gingerbread | x2.5m Christmas Spirit');
    expect(tags).toEqual(['x50qd Santa Damage', 'x200m Gingerbread', 'x2.5m Christmas Spirit']);
  });

  it('selectCardsBetweenMarkers returns cards strictly between Main and Shop in pos order', () => {
    const cards = [
      { name: 'Shop', pos: 30, desc: '' },
      { name: 'Energy', pos: 20, desc: '' },
      { name: 'Main', pos: 10, desc: '' },
      { name: 'Frost', pos: 15, desc: '' },
    ];
    const windowCards = selectCardsBetweenMarkers(cards, 'Main', 'Shop');
    expect(windowCards.map(c => c.name)).toEqual(['Frost', 'Energy']);
  });
});


