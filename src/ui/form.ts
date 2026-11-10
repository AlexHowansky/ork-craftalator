/** Binds the input form to the calculator and the results panel. */
import { createLogger } from '../logger';
import { parsePrice } from '../money';
import {
  calculate,
  itemLevelLimitReason,
  maxItemLevel,
} from '../rules/crafting';
import {
  LIMITS,
  PROFICIENCIES,
  RULES_VERSIONS,
  type Proficiency,
  type RulesVersion,
} from '../rules/types';
import { byId, setError } from './dom';
import { createRangeInput, type RangeInput } from './rangeInput';
import { clearResult, renderResult } from './results';

const log = createLogger('form');

function oneOf<T extends string>(
  allowed: readonly T[],
  value: string,
  fallback: T,
): T {
  return (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function range(
  id: string,
  label: string,
  min: number,
  max: number,
  onChange: () => void,
): RangeInput {
  return createRangeInput({
    text: byId(id, HTMLInputElement),
    slider: byId(`${id}-slider`, HTMLInputElement),
    error: byId(`${id}-error`, HTMLElement),
    label,
    min,
    max,
    onChange,
  });
}

export function initForm(): void {
  const rulesVersion = byId('rules-version', HTMLSelectElement);
  const proficiency = byId('proficiency', HTMLSelectElement);
  const hasFormula = byId('has-formula', HTMLInputElement);
  const hasSpecialty = byId('has-specialty', HTMLInputElement);
  const price = byId('price', HTMLInputElement);
  const priceError = byId('price-error', HTMLElement);
  const itemLimit = byId('item-level-limit', HTMLElement);

  // Ignore change events fired while the inputs are being set up.
  let ready = false;

  const update = (): void => {
    if (ready) recalc();
  };

  const bonus = range(
    'bonus',
    'Crafting bonus',
    LIMITS.bonus.min,
    LIMITS.bonus.max,
    update,
  );
  const itemLevel = range(
    'item-level',
    'Item level',
    LIMITS.itemLevel.min,
    LIMITS.characterLevel.min,
    update,
  );
  const characterLevel = range(
    'character-level',
    'Character level',
    LIMITS.characterLevel.min,
    LIMITS.characterLevel.max,
    () => {
      applyItemLevelCap();
      update();
    },
  );
  const days = range('days', 'Additional days', 0, 0, update);

  function currentProficiency(): Proficiency {
    return oneOf<Proficiency>(PROFICIENCIES, proficiency.value, 'trained');
  }

  /** Limit item level by character level and Crafting proficiency. */
  function applyItemLevelCap(): void {
    const rank = currentProficiency();
    itemLevel.setMax(maxItemLevel(characterLevel.value, rank));
    const reason = itemLevelLimitReason(characterLevel.value, rank);
    setError(itemLimit, reason);
  }

  applyItemLevelCap();

  function recalc(): void {
    const parsed = parsePrice(price.value);
    if (!parsed.ok) {
      setError(priceError, parsed.error);
      price.setAttribute('aria-invalid', 'true');
      clearResult();
      log.debug('Price invalid', price.value);
      return;
    }
    setError(priceError, null);
    price.setAttribute('aria-invalid', 'false');

    const inputs = {
      rulesVersion: oneOf<RulesVersion>(
        RULES_VERSIONS,
        rulesVersion.value,
        'remaster',
      ),
      hasFormula: hasFormula.checked,
      hasSpecialty: hasSpecialty.checked,
      proficiency: currentProficiency(),
      bonus: bonus.value,
      characterLevel: characterLevel.value,
      itemLevel: itemLevel.value,
      priceCp: parsed.cp,
      additionalDays: days.value,
    };

    try {
      const result = calculate(inputs);
      // May clamp the days value, which re-enters recalc() once.
      days.setMax(result.maxDays);
      if (days.value !== inputs.additionalDays) return;
      log.debug('Calculated', inputs, result);
      renderResult(result);
    } catch (err) {
      log.error('Calculation failed', err);
      setError(
        priceError,
        'Something went wrong with that calculation. Please check the inputs.',
      );
      clearResult();
    }
  }

  for (const el of [rulesVersion, hasFormula, hasSpecialty]) {
    el.addEventListener('change', update);
  }
  proficiency.addEventListener('change', () => {
    applyItemLevelCap();
    update();
  });
  price.addEventListener('input', update);
  // The form has no submit action; keep Enter from reloading the page.
  byId('inputs', HTMLFormElement).addEventListener('submit', (e) => {
    e.preventDefault();
  });

  ready = true;
  recalc();
  log.info('Calculator ready');
}
