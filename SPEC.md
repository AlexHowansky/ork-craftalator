## Craftalator Specification

What the app does: its terms and its features. How it is built is in
`CLAUDE.md`.

## Features

We are building an app to calculate time and cost of crafting items in the
Pathfinder 2nd edition role playing system.

* Provide inputs for the following values:

  * Rules version. Implemented as a selector. Values are: Remaster (Player
    Core) and Legacy (Core Rulebook). Defaults to Remaster.

  * Formula. Implemented as a checkbox: whether the crafter has the item's
    formula.

  * Crafting skill proficiency level. Implemented as a selector. Values are:
    trained, expert, master, legendary.

  * Crafting skill bonus. Implemented as a text box with a slider. The user
    can type a value or use the slider to adjust within the allowed range.
    Values are 0 - 40.

  * Character level of the crafter. Implemented as a text box with a slider.
    The user can type a value or use the slider to adjust within the allowed
    range. Values are 1 - 20.

  * Item level of the thing being crafted. Implemented as a text box with a
    slider. The user can type a value or use the slider to adjust within the
    allowed range. Values are 0 - the highest level the crafter may Craft
    (see Crafting rules). When Crafting proficiency, not character level,
    is the limit, a note under the input says why.

  * The retail price of the item. Implemented as a text box. Accepts
    amounts such as `15 gp`, `3 gp 5 sp`, `40 cp` or `1 pp`. A bare number
    is read as gold pieces (decimals allowed, e.g. `2.5`).

  * The number of additional days spent. Implemented as a text box with a
    slider. The user can type a value or use the slider to adjust within the
    allowed range. Values are 0 - max required for this item.

* Given the values provided, use the crafting rules to calculate the initial
  monetary expenditure, the initial time requirement, the number of days
  required, and the additional monetary expenditure required given the
  position of the additional days spent slider.

* Appearance: a modern steampunk theme. Flat warm surfaces with hairline
  borders and rounded corners; brass and copper are used as accents (a
  brass-to-copper strip atop each panel, brass sliders and focus rings, a
  gear logo and a faint gear watermark that slowly turn, still when the
  user prefers reduced motion). Headings and key figures use a serif; body
  text uses the system sans-serif. Light and dark modes follow the system.

## Crafting rules

* Initial monetary expenditure: raw materials worth half the item's Price
  (rounded up to the copper).

* Initial time requirement (days of setup before the Crafting check):

  * Remaster: 2 days, or 1 day with the formula.
  * Legacy: 4 days, or 2 days with the formula.

* Crafting check DC: the DCs by Level table for the item level (common
  rarity assumed). The app shows the chance of each degree of success using
  the Crafting skill bonus on a d20, including the natural 1 and natural 20
  rules.

* Remaining cost: the Price minus the initial expenditure.

* Daily reduction: each additional day reduces the remaining cost by the
  Income Earned table value for the crafter's level and proficiency. On a
  critical success the crafter's level + 1 is used (level 20 uses the
  "20 (critical success)" row).

* Max additional days: the remaining cost divided by the daily reduction,
  rounded up. The additional days slider is limited to the max for a
  success (a critical success never needs more days than a success).

* Additional monetary expenditure: the remaining cost minus the additional
  days times the daily reduction, never below zero.

* Results are shown side by side for both a success and a critical success,
  using the same additional days value.

* Item level limit: the item must be the crafter's level or lower. If the
  item is 9th level or higher, the crafter must be a master in Crafting,
  and if it's 17th or higher, legendary. So trained and expert crafters
  are limited to 8th level, master to 16th and legendary to 20th. If a
  change to character level or proficiency lowers the limit, the item
  level is reduced to fit.
