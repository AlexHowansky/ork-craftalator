export const PROFICIENCIES = [
  'trained',
  'expert',
  'master',
  'legendary',
] as const;
export type Proficiency = (typeof PROFICIENCIES)[number];

export const RULES_VERSIONS = ['remaster', 'legacy'] as const;
export type RulesVersion = (typeof RULES_VERSIONS)[number];

export type Degree = 'criticalSuccess' | 'success';

export const LIMITS = Object.freeze({
  bonus: { min: 0, max: 40 },
  characterLevel: { min: 1, max: 20 },
  itemLevel: { min: 0, max: 20 },
});

export interface CraftingInputs {
  readonly rulesVersion: RulesVersion;
  readonly hasFormula: boolean;
  readonly proficiency: Proficiency;
  readonly bonus: number;
  readonly characterLevel: number;
  readonly itemLevel: number;
  /** Item Price in copper pieces. */
  readonly priceCp: number;
  readonly additionalDays: number;
}
