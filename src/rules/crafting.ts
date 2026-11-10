/** Pure PF2e Craft activity calculations. All money is in copper. */
import { DC_BY_LEVEL } from '../data/dcByLevel';
import { INCOME_EARNED, INCOME_MAX_INDEX } from '../data/incomeTable';
import type {
  CraftingInputs,
  Degree,
  Proficiency,
  RulesVersion,
} from './types';

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/** Days of setup before the Crafting check. */
export function setupDays(version: RulesVersion, hasFormula: boolean): number {
  if (version === 'legacy') return hasFormula ? 2 : 4;
  return hasFormula ? 1 : 2;
}

/** Raw materials spent up front: half the Price, rounded up. */
export function upfrontCost(priceCp: number): number {
  return Math.ceil(priceCp / 2);
}

/** Cost still owed after the upfront materials. */
export function remainingCost(priceCp: number): number {
  return priceCp - upfrontCost(priceCp);
}

/** Craft DC for an item level (common rarity). */
export function craftDc(itemLevel: number): number {
  const dc = DC_BY_LEVEL[clampInt(itemLevel, 0, DC_BY_LEVEL.length - 1)];
  if (dc === undefined) throw new RangeError(`No DC for level ${itemLevel}`);
  return dc;
}

/** Per-day cost reduction from the Income Earned table. */
export function dailyReduction(
  characterLevel: number,
  proficiency: Proficiency,
  degree: Degree,
): number {
  const level =
    degree === 'criticalSuccess' ? characterLevel + 1 : characterLevel;
  const row = INCOME_EARNED[clampInt(level, 0, INCOME_MAX_INDEX)];
  if (!row) throw new RangeError(`No income row for level ${level}`);
  return row[proficiency];
}

/** Additional days needed to bring the remaining cost to zero. */
export function maxAdditionalDays(
  remainingCp: number,
  perDayCp: number,
): number {
  if (remainingCp <= 0) return 0;
  if (perDayCp <= 0) throw new RangeError('Daily reduction must be positive');
  return Math.ceil(remainingCp / perDayCp);
}

/** Cost still owed after spending some additional days. */
export function additionalCost(
  remainingCp: number,
  perDayCp: number,
  days: number,
): number {
  return Math.max(0, remainingCp - Math.max(0, days) * perDayCp);
}

export interface CheckOdds {
  readonly criticalSuccess: number;
  readonly success: number;
  readonly failure: number;
  readonly criticalFailure: number;
}

/**
 * Chance (0 - 1) of each degree of success for d20 + bonus vs DC,
 * applying the natural 20 / natural 1 one-step adjustment.
 */
export function checkOdds(bonus: number, dc: number): CheckOdds {
  const counts = [0, 0, 0, 0]; // crit fail, fail, success, crit success
  for (let roll = 1; roll <= 20; roll += 1) {
    const total = roll + bonus;
    let degree =
      total >= dc + 10 ? 3 : total >= dc ? 2 : total <= dc - 10 ? 0 : 1;
    if (roll === 20) degree = Math.min(3, degree + 1);
    if (roll === 1) degree = Math.max(0, degree - 1);
    counts[degree] = (counts[degree] ?? 0) + 1;
  }
  const p = (i: number): number => (counts[i] ?? 0) / 20;
  return {
    criticalFailure: p(0),
    failure: p(1),
    success: p(2),
    criticalSuccess: p(3),
  };
}

/** Highest item level each proficiency rank may Craft. */
const PROFICIENCY_ITEM_CAP: Record<Proficiency, number> = {
  trained: 8,
  expert: 8,
  master: 16,
  legendary: 20,
};

/**
 * Highest item level the crafter may Craft: the item must be their level or
 * lower, 9th level or higher needs master and 17th or higher needs
 * legendary.
 */
export function maxItemLevel(
  characterLevel: number,
  proficiency: Proficiency,
): number {
  return Math.min(characterLevel, PROFICIENCY_ITEM_CAP[proficiency]);
}

/**
 * Explains why the item level is capped, when proficiency (not character
 * level) is what limits it; otherwise null.
 */
export function itemLevelLimitReason(
  characterLevel: number,
  proficiency: Proficiency,
): string | null {
  const cap = PROFICIENCY_ITEM_CAP[proficiency];
  if (characterLevel <= cap) return null;
  return cap < 16
    ? 'Items of 9th level or higher require master Crafting.'
    : 'Items of 17th level or higher require legendary Crafting.';
}

export interface DegreeResult {
  readonly perDayCp: number;
  readonly maxDays: number;
  readonly additionalCostCp: number;
  readonly totalCostCp: number;
  /** Setup days + additional days actually needed at the chosen days. */
  readonly totalDays: number;
}

export interface CraftingResult {
  readonly setupDays: number;
  readonly upfrontCp: number;
  readonly remainingCp: number;
  readonly dc: number;
  readonly odds: CheckOdds;
  /** Upper bound for the additional days input. */
  readonly maxDays: number;
  readonly success: DegreeResult;
  readonly criticalSuccess: DegreeResult;
}

function degreeResult(
  inputs: CraftingInputs,
  degree: Degree,
  setup: number,
  upfront: number,
  remaining: number,
): DegreeResult {
  const perDayCp = dailyReduction(
    inputs.characterLevel,
    inputs.proficiency,
    degree,
  );
  const maxDays = maxAdditionalDays(remaining, perDayCp);
  const daysUsed = Math.min(Math.max(0, inputs.additionalDays), maxDays);
  const additionalCostCp = additionalCost(remaining, perDayCp, daysUsed);
  return {
    perDayCp,
    maxDays,
    additionalCostCp,
    totalCostCp: upfront + additionalCostCp,
    totalDays: setup + daysUsed,
  };
}

/** Compute every output for a validated set of inputs. */
export function calculate(inputs: CraftingInputs): CraftingResult {
  const cap = maxItemLevel(inputs.characterLevel, inputs.proficiency);
  if (inputs.itemLevel > cap) {
    throw new RangeError(
      `Item level ${inputs.itemLevel} is above the allowed ${cap}`,
    );
  }
  const setup = setupDays(inputs.rulesVersion, inputs.hasFormula);
  const upfront = upfrontCost(inputs.priceCp);
  const remaining = remainingCost(inputs.priceCp);
  const dc = craftDc(inputs.itemLevel);
  const success = degreeResult(inputs, 'success', setup, upfront, remaining);
  const criticalSuccess = degreeResult(
    inputs,
    'criticalSuccess',
    setup,
    upfront,
    remaining,
  );
  return {
    setupDays: setup,
    upfrontCp: upfront,
    remainingCp: remaining,
    dc,
    odds: checkOdds(inputs.bonus, dc),
    maxDays: success.maxDays,
    success,
    criticalSuccess,
  };
}
