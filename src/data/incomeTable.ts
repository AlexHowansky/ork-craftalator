/**
 * Table 4-2: Income Earned (Player Core / Core Rulebook), success columns
 * only, in copper pieces. Index is the task level; index 21 is the
 * "20 (critical success)" row.
 */
import type { Proficiency } from '../rules/types';

type Row = Readonly<Record<Proficiency, number>>;

const row = (
  trained: number,
  expert: number,
  master: number,
  legendary: number,
): Row => Object.freeze({ trained, expert, master, legendary });

export const INCOME_EARNED: readonly Row[] = Object.freeze([
  row(5, 5, 5, 5), // 0
  row(20, 20, 20, 20), // 1
  row(30, 30, 30, 30), // 2
  row(50, 50, 50, 50), // 3
  row(70, 80, 80, 80), // 4
  row(90, 100, 100, 100), // 5
  row(150, 200, 200, 200), // 6
  row(200, 250, 250, 250), // 7
  row(250, 300, 300, 300), // 8
  row(300, 400, 400, 400), // 9
  row(400, 500, 600, 600), // 10
  row(500, 600, 800, 800), // 11
  row(600, 800, 1000, 1000), // 12
  row(700, 1000, 1500, 1500), // 13
  row(800, 1500, 2000, 2000), // 14
  row(1000, 2000, 2800, 2800), // 15
  row(1300, 2500, 3600, 4000), // 16
  row(1500, 3000, 4500, 5500), // 17
  row(2000, 4500, 7000, 9000), // 18
  row(3000, 6000, 10000, 13000), // 19
  row(4000, 7500, 15000, 20000), // 20
  row(5000, 9000, 17500, 30000), // 20 (critical success)
]);

/** Highest table index (the "20 (critical success)" row). */
export const INCOME_MAX_INDEX = INCOME_EARNED.length - 1;
