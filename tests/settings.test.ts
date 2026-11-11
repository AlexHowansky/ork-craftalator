import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CRAFTER,
  STORAGE_KEY,
  loadCrafterSettings,
  parseCrafterSettings,
  saveCrafterSettings,
  type CrafterSettings,
} from '../src/settings';

const SAMPLE: CrafterSettings = {
  rulesVersion: 'legacy',
  characterLevel: 12,
  proficiency: 'master',
  bonus: 22,
  feats: { alchemical: true, magical: false, snare: true },
};

describe('parseCrafterSettings', () => {
  it('accepts valid settings', () => {
    expect(parseCrafterSettings(SAMPLE)).toEqual(SAMPLE);
  });

  it.each([null, 'x', 42, [], undefined])('defaults for %j', (data) => {
    expect(parseCrafterSettings(data)).toEqual(DEFAULT_CRAFTER);
  });

  it('replaces only the invalid fields', () => {
    const parsed = parseCrafterSettings({
      ...SAMPLE,
      rulesVersion: 'pf1',
      characterLevel: 21,
      proficiency: { toString: () => 'master' },
      bonus: 2.5,
      feats: { alchemical: 'yes', snare: true, extra: true },
    });
    expect(parsed).toEqual({
      rulesVersion: 'remaster',
      characterLevel: 1,
      proficiency: 'trained',
      bonus: 5,
      feats: { alchemical: false, magical: false, snare: true },
    });
  });

  it('rejects out-of-range and non-numeric levels and bonuses', () => {
    for (const bad of [0, -1, '5', NaN, Infinity]) {
      expect(parseCrafterSettings({ characterLevel: bad }).characterLevel).toBe(
        1,
      );
      expect(parseCrafterSettings({ bonus: bad }).bonus).toBe(
        bad === 0 ? 0 : 5,
      );
    }
    expect(parseCrafterSettings({ bonus: 41 }).bonus).toBe(5);
  });
});

describe('load and save', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('returns null when nothing is saved', () => {
    expect(loadCrafterSettings()).toBeNull();
  });

  it('round-trips settings', () => {
    saveCrafterSettings(SAMPLE);
    expect(loadCrafterSettings()).toEqual(SAMPLE);
  });

  it('returns null for corrupt JSON', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadCrafterSettings()).toBeNull();
  });

  it('ignores storage errors', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => saveCrafterSettings(SAMPLE)).not.toThrow();
    expect(loadCrafterSettings()).toBeNull();
  });
});
