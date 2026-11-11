import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../src/settings';
import { initForm } from '../src/ui/form';

const html = readFileSync('index.html', 'utf8');
const body = new DOMParser().parseFromString(html, 'text/html').body;

const el = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

function change(id: string, value: string | boolean): void {
  const input = el<HTMLInputElement>(id);
  if (typeof value === 'boolean') input.checked = value;
  else input.value = value;
  input.dispatchEvent(new Event(input.type === 'text' ? 'input' : 'change'));
}

describe('Crafter panel persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.replaceChildren(
      ...Array.from(body.cloneNode(true).childNodes),
    );
  });

  it('restores saved settings on start', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rulesVersion: 'legacy',
        characterLevel: 10,
        proficiency: 'master',
        bonus: 18,
        feats: { alchemical: false, magical: true, snare: false },
      }),
    );
    initForm();
    expect(el<HTMLSelectElement>('rules-version').value).toBe('legacy');
    expect(el<HTMLInputElement>('character-level').value).toBe('10');
    expect(el<HTMLInputElement>('character-level-slider').value).toBe('10');
    expect(el<HTMLSelectElement>('proficiency').value).toBe('master');
    expect(el<HTMLInputElement>('bonus').value).toBe('18');
    expect(el<HTMLInputElement>('has-magical').checked).toBe(true);
    expect(el<HTMLInputElement>('has-alchemical').checked).toBe(false);
    // Master at level 10 may Craft level 10 items.
    expect(el<HTMLInputElement>('item-level-slider').max).toBe('10');
  });

  it('saves changes to the Crafter panel', () => {
    initForm();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    change('rules-version', 'legacy');
    change('character-level', '7');
    change('proficiency', 'expert');
    change('bonus', '14');
    change('has-snare', true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).toEqual({
      rulesVersion: 'legacy',
      characterLevel: 7,
      proficiency: 'expert',
      bonus: 14,
      feats: { alchemical: false, magical: false, snare: true },
    });
  });
});
