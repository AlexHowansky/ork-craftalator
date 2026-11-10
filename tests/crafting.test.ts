import { describe, expect, it } from 'vitest';
import {
  additionalCost,
  calculate,
  checkOdds,
  craftDc,
  dailyReduction,
  formulaPrice,
  maxAdditionalDays,
  itemLevelLimitReason,
  maxItemLevel,
  setupDays,
  specialtyBonus,
  impeccableAllowed,
  upgradeSuccesses,
  upfrontCost,
} from '../src/rules/crafting';
import type { CraftingInputs } from '../src/rules/types';

const base: CraftingInputs = {
  rulesVersion: 'remaster',
  hasFormula: false,
  hasSpecialty: false,
  hasImpeccable: false,
  proficiency: 'trained',
  bonus: 7,
  characterLevel: 1,
  itemLevel: 1,
  rarity: 'common',
  priceCp: 2000,
  additionalDays: 0,
};

describe('setupDays', () => {
  it.each([
    ['remaster', false, 2],
    ['remaster', true, 1],
    ['legacy', false, 4],
    ['legacy', true, 2],
  ] as const)('%s formula=%s -> %d', (v, f, d) => {
    expect(setupDays(v, f)).toBe(d);
  });
});

describe('formulaPrice', () => {
  it.each([
    [0, 50],
    [1, 100],
    [5, 800],
    [14, 22_500],
    [20, 350_000],
  ])('level %d -> %d cp', (level, cp) => {
    expect(formulaPrice(level)).toBe(cp);
  });

  it('clamps out-of-range levels', () => {
    expect(formulaPrice(-3)).toBe(50);
    expect(formulaPrice(25)).toBe(350_000);
  });
});

describe('costs', () => {
  it('spends half the Price up front, rounded up', () => {
    expect(upfrontCost(2000)).toBe(1000);
    expect(upfrontCost(5)).toBe(3);
  });

  it('rounds max days up', () => {
    expect(maxAdditionalDays(1000, 20)).toBe(50);
    expect(maxAdditionalDays(1001, 20)).toBe(51);
    expect(maxAdditionalDays(0, 20)).toBe(0);
  });

  it('never goes below zero', () => {
    expect(additionalCost(1000, 20, 25)).toBe(500);
    expect(additionalCost(1000, 20, 99)).toBe(0);
  });
});

describe('dailyReduction', () => {
  it('reads Income Earned', () => {
    expect(dailyReduction(1, 'trained', 'success')).toBe(20);
    expect(dailyReduction(16, 'master', 'success')).toBe(3600);
    expect(dailyReduction(16, 'master', 'criticalSuccess')).toBe(4500);
  });

  it('uses the 20 crit row at level 20', () => {
    expect(dailyReduction(20, 'legendary', 'criticalSuccess')).toBe(30000);
    expect(dailyReduction(20, 'trained', 'criticalSuccess')).toBe(5000);
  });
});

describe('craftDc', () => {
  it('uses DCs by level', () => {
    expect(craftDc(0)).toBe(14);
    expect(craftDc(9)).toBe(26);
    expect(craftDc(20)).toBe(40);
  });

  it('adds the rarity adjustment', () => {
    expect(craftDc(5, 'common')).toBe(20);
    expect(craftDc(5, 'uncommon')).toBe(22);
    expect(craftDc(5, 'rare')).toBe(25);
    expect(craftDc(5, 'unique')).toBe(30);
  });
});

describe('checkOdds', () => {
  const sum = (o: ReturnType<typeof checkOdds>): number =>
    o.criticalSuccess + o.success + o.failure + o.criticalFailure;

  it('adds up to 1', () => {
    for (const bonus of [0, 10, 40]) expect(sum(checkOdds(bonus, 20))).toBe(1);
  });

  it('applies nat 20 / nat 1 steps', () => {
    // +10 vs DC 20: 1 = crit fail (fail-1), 2-9 fail, 10-19 success,
    // 20 = crit success (success+1).
    expect(checkOdds(10, 20)).toEqual({
      criticalFailure: 0.05,
      failure: 0.4,
      success: 0.5,
      criticalSuccess: 0.05,
    });
  });

  it('still fails on a nat 1 with a huge bonus', () => {
    // +40 vs DC 14: everything crits, nat 1 drops to success.
    expect(checkOdds(40, 14).success).toBe(0.05);
    expect(checkOdds(40, 14).criticalSuccess).toBe(0.95);
  });
});

describe('maxItemLevel', () => {
  it.each([
    [5, 'trained', 5],
    [12, 'trained', 8],
    [12, 'expert', 8],
    [12, 'master', 12],
    [20, 'master', 16],
    [20, 'legendary', 20],
  ] as const)('level %d %s -> %d', (lvl, rank, cap) => {
    expect(maxItemLevel(lvl, rank)).toBe(cap);
  });
});

describe('itemLevelLimitReason', () => {
  it('explains a proficiency cap only when it binds', () => {
    expect(itemLevelLimitReason(8, 'trained')).toBeNull();
    expect(itemLevelLimitReason(9, 'expert')).toMatch(/master/);
    expect(itemLevelLimitReason(16, 'master')).toBeNull();
    expect(itemLevelLimitReason(17, 'master')).toMatch(/legendary/);
    expect(itemLevelLimitReason(20, 'legendary')).toBeNull();
  });
});

describe('calculate', () => {
  it('raises the DC for rarity', () => {
    const common = calculate(base);
    const rare = calculate({ ...base, rarity: 'rare' });
    expect(rare.dc).toBe(common.dc + 5);
    expect(rare.odds).toEqual(checkOdds(base.bonus, rare.dc));
  });

  it('matches the worked example', () => {
    const r = calculate({ ...base, additionalDays: 25 });
    expect(r.upfrontCp).toBe(1000);
    expect(r.setupDays).toBe(2);
    expect(r.success.perDayCp).toBe(20);
    expect(r.success.maxDays).toBe(50);
    expect(r.success.additionalCostCp).toBe(500);
    expect(r.success.totalDays).toBe(27);
    // Crit: level 2 trained = 3 sp/day -> 34 days; 1000 - 750 = 250.
    expect(r.criticalSuccess.maxDays).toBe(34);
    expect(r.criticalSuccess.additionalCostCp).toBe(250);
    expect(r.maxDays).toBe(50);
  });

  it('rejects an item above the allowed level', () => {
    expect(() =>
      calculate({ ...base, characterLevel: 10, itemLevel: 9 }),
    ).toThrow(RangeError);
    expect(() =>
      calculate({
        ...base,
        characterLevel: 10,
        itemLevel: 9,
        proficiency: 'master',
      }),
    ).not.toThrow();
  });

  it('caps crit total days at its own max', () => {
    const r = calculate({ ...base, additionalDays: 50 });
    expect(r.criticalSuccess.additionalCostCp).toBe(0);
    expect(r.criticalSuccess.totalDays).toBe(2 + 34);
  });
});

describe('Specialty Crafting', () => {
  it.each([
    [false, 'master', 0],
    [true, 'trained', 1],
    [true, 'expert', 1],
    [true, 'master', 2],
    [true, 'legendary', 2],
  ] as const)('feat=%s %s -> +%d', (has, rank, bonus) => {
    expect(specialtyBonus(has, rank)).toBe(bonus);
  });

  it('adds to the check bonus and odds', () => {
    const without = calculate(base);
    const withFeat = calculate({ ...base, hasSpecialty: true });
    expect(without.checkBonus).toBe(base.bonus);
    expect(withFeat.checkBonus).toBe(base.bonus + 1);
    expect(withFeat.odds).toEqual(checkOdds(base.bonus + 1, withFeat.dc));
  });
});

describe('Impeccable Crafting', () => {
  it.each([
    [false, 'legendary', false],
    [true, 'trained', false],
    [true, 'expert', false],
    [true, 'master', true],
    [true, 'legendary', true],
  ] as const)('specialty=%s %s -> %s', (has, rank, allowed) => {
    expect(impeccableAllowed(has, rank)).toBe(allowed);
  });

  it('moves the success chance into critical success', () => {
    const odds = checkOdds(10, 20);
    const up = upgradeSuccesses(odds);
    expect(up.success).toBe(0);
    expect(up.criticalSuccess).toBeCloseTo(odds.criticalSuccess + odds.success);
    expect(up.failure).toBe(odds.failure);
    expect(up.criticalFailure).toBe(odds.criticalFailure);
  });

  const master = {
    ...base,
    proficiency: 'master',
    characterLevel: 9,
    itemLevel: 9,
    bonus: 20,
    priceCp: 100000,
    hasSpecialty: true,
  } as const;

  it('makes a success pay out as a critical success', () => {
    const r = calculate({ ...master, hasImpeccable: true });
    expect(r.impeccable).toBe(true);
    expect(r.success).toEqual(r.criticalSuccess);
    expect(r.maxDays).toBe(r.criticalSuccess.maxDays);
    expect(r.odds.success).toBe(0);
  });

  it('is ignored without its prerequisites', () => {
    const r = calculate({
      ...master,
      hasSpecialty: false,
      hasImpeccable: true,
    });
    expect(r.impeccable).toBe(false);
    expect(r.success.perDayCp).toBeLessThan(r.criticalSuccess.perDayCp);
  });
});
