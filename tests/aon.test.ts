import { describe, expect, it } from 'vitest';
import {
  MAX_HITS,
  buildCatalogQuery,
  parseResponse,
  parseStoredItem,
  toItemMatch,
} from '../src/aon';

const hit = (id: string, source: Record<string, unknown>) => ({
  _id: id,
  _source: source,
});

const minor = hit('equipment-2943-2812', {
  name: 'Healing Potion (Minor)',
  level: 1,
  price: 400,
  rarity: 'common',
  url: '/Equipment.aspx?ID=2943',
});

describe('buildCatalogQuery', () => {
  it('asks for every Craftable item in one request', () => {
    const q = buildCatalogQuery();
    expect(q).toMatchObject({ size: MAX_HITS, track_total_hits: true });
    const text = JSON.stringify(q);
    expect(text).toContain('"price"');
    expect(text).toContain('"exclude_from_search"');
    expect(text).not.toContain('match_phrase_prefix');
  });
});

describe('parseResponse', () => {
  it('maps hits to stored items and reads the total', () => {
    const { total, items } = parseResponse({
      hits: { total: { value: 1 }, hits: [minor] },
    });
    expect(total).toBe(1);
    expect(items).toEqual([
      {
        id: 'equipment-2943-2812',
        name: 'Healing Potion (Minor)',
        level: 1,
        priceCp: 400,
        rarity: 'common',
        legacy: false,
        path: '/Equipment.aspx?ID=2943',
      },
    ]);
  });

  it('marks legacy items and defaults the rarity', () => {
    const legacy = hit('weapon-31', {
      name: 'Longsword',
      level: 0,
      price: 100,
      remaster_id: ['weapon-386'],
      url: '/Weapons.aspx?ID=31',
    });
    const [item] = parseResponse({ hits: { hits: [legacy] } }).items;
    expect(item?.legacy).toBe(true);
    expect(item?.rarity).toBe('common');
  });

  it('skips unusable hits and duplicates', () => {
    const { total, items } = parseResponse({
      hits: {
        hits: [
          minor,
          minor,
          hit('a', { name: 'No price', level: 1 }),
          hit('b', { name: 'Too high', level: 25, price: 100 }),
          hit('c', { name: 'Fraction', level: 1, price: 1.5 }),
          hit('d', { name: '', level: 1, price: 100 }),
          hit('', { name: 'No id', level: 1, price: 100 }),
          null,
          'junk',
        ],
      },
    });
    expect(total).toBeNull();
    expect(items.map((i) => i.id)).toEqual(['equipment-2943-2812']);
  });

  it('drops links that are not AoN page paths', () => {
    for (const url of ['javascript:alert(1)', 'https://evil.example/x']) {
      const bad = hit('x', { name: 'X', level: 1, price: 100, url });
      expect(parseResponse({ hits: { hits: [bad] } }).items[0]?.path).toBe(
        null,
      );
    }
  });

  it('rejects a malformed response', () => {
    expect(() => parseResponse({})).toThrow();
    expect(() => parseResponse({ hits: { hits: 'x' } })).toThrow();
  });
});

describe('parseStoredItem', () => {
  it('validates a stored entry', () => {
    const stored = {
      id: 'x',
      name: ' X ',
      level: 3,
      priceCp: 10,
      rarity: 'rare',
      legacy: true,
      path: '/Armor.aspx?ID=1',
    };
    expect(parseStoredItem(stored)).toEqual({ ...stored, name: 'X' });
    expect(parseStoredItem({ ...stored, priceCp: 0 })).toBeNull();
    expect(parseStoredItem({ ...stored, rarity: '<b>' })?.rarity).toBe(
      'common',
    );
    expect(parseStoredItem({ ...stored, legacy: 'yes' })?.legacy).toBe(false);
    expect(parseStoredItem([])).toBeNull();
  });
});

describe('toItemMatch', () => {
  it('turns the page path into an absolute AoN link', () => {
    const [stored] = parseResponse({ hits: { hits: [minor] } }).items;
    expect(stored && toItemMatch(stored).url).toBe(
      'https://2e.aonprd.com/Equipment.aspx?ID=2943',
    );
    expect(stored && toItemMatch({ ...stored, path: null }).url).toBeNull();
  });
});
