/**
 * Remembers the Crafter panel between visits, in localStorage. Stored data
 * is untrusted: every field is validated on load, and any field that is
 * missing or invalid falls back to its default. Storage may be unavailable
 * (private browsing, blocked site data); failures are logged and ignored.
 */
import { createLogger } from './logger';
import {
  CRAFTING_FEATS,
  LIMITS,
  PROFICIENCIES,
  RULES_VERSIONS,
  type CraftingFeat,
  type Proficiency,
  type RulesVersion,
} from './rules/types';

const log = createLogger('settings');

export const STORAGE_KEY = 'craftalator.crafter.v1';

export interface CrafterSettings {
  readonly rulesVersion: RulesVersion;
  readonly characterLevel: number;
  readonly proficiency: Proficiency;
  readonly bonus: number;
  readonly feats: Readonly<Record<CraftingFeat, boolean>>;
}

export const DEFAULT_CRAFTER: CrafterSettings = Object.freeze({
  rulesVersion: 'remaster',
  characterLevel: 1,
  proficiency: 'trained',
  bonus: 5,
  feats: Object.freeze({ alchemical: false, magical: false, snare: false }),
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function oneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
  fallback: T,
): T {
  return typeof value === 'string' &&
    (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function intIn(
  value: unknown,
  limits: { readonly min: number; readonly max: number },
  fallback: number,
): number {
  return Number.isInteger(value) &&
    (value as number) >= limits.min &&
    (value as number) <= limits.max
    ? (value as number)
    : fallback;
}

/** Validate parsed storage data, falling back to defaults field by field. */
export function parseCrafterSettings(data: unknown): CrafterSettings {
  const d = DEFAULT_CRAFTER;
  if (!isRecord(data)) return d;
  const feats = isRecord(data.feats) ? data.feats : {};
  return {
    rulesVersion: oneOf(RULES_VERSIONS, data.rulesVersion, d.rulesVersion),
    characterLevel: intIn(
      data.characterLevel,
      LIMITS.characterLevel,
      d.characterLevel,
    ),
    proficiency: oneOf(PROFICIENCIES, data.proficiency, d.proficiency),
    bonus: intIn(data.bonus, LIMITS.bonus, d.bonus),
    feats: Object.fromEntries(
      CRAFTING_FEATS.map((f) => [
        f,
        typeof feats[f] === 'boolean' ? feats[f] : d.feats[f],
      ]),
    ) as Record<CraftingFeat, boolean>,
  };
}

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The saved Crafter settings, or null if none are saved or readable. */
export function loadCrafterSettings(): CrafterSettings | null {
  try {
    const raw = storage()?.getItem(STORAGE_KEY) ?? null;
    if (raw === null) return null;
    const settings = parseCrafterSettings(JSON.parse(raw));
    log.debug('Loaded Crafter settings', settings);
    return settings;
  } catch (err) {
    log.warn('Could not load saved Crafter settings', err);
    return null;
  }
}

export function saveCrafterSettings(settings: CrafterSettings): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    log.warn('Could not save Crafter settings', err);
  }
}
