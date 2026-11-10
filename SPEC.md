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

  * Specialty Crafting. Implemented as a checkbox: whether the crafter has
    the Specialty Crafting feat for this kind of item.

  * Impeccable Crafting. Implemented as a checkbox: whether the crafter
    has the Impeccable Crafting feat for this kind of item. Only enabled
    when Specialty Crafting is checked and the crafter is a master or
    legendary in Crafting; otherwise it is unchecked.

  * Crafting skill proficiency level. Implemented as a selector. Values are:
    trained, expert, master, legendary.

  * Crafting skill bonus. Implemented as a text box with a slider. The user
    can type a value or use the slider to adjust within the allowed range.
    Values are 0 - 40.

  * Character level of the crafter. Implemented as a text box with a slider.
    The user can type a value or use the slider to adjust within the allowed
    range. Values are 1 - 20.

  * Item search. Implemented as a text box with autocomplete. Typing at
    least 2 characters searches a copy of the Archives of Nethys (AoN)
    Craftable items (equipment, weapons, armor and shields priced above 0,
    level 0 - 20) bundled with the app, so the search works offline and
    makes no requests to AoN. Names match when they start with the text,
    contain its words in order, or contain words starting with each of
    its words in any order, ignoring case, accents and punctuation.
    Matches are shown in a list (up to 25), best name match first and
    equally good matches by item level (lowest first), then name, with
    their level, Price and, when not common, rarity; Legacy
    items that have a Remaster version are marked Legacy. Choosing a
    match (mouse or arrow keys and Enter) fills in the item level and the item
    Price and recalculates everything, including the Crafting DC and
    initial cost. A link to the item's AoN page is then shown.
    Matches above the highest level the crafter can Craft (see Item level
    limit) are shown ghosted, marked too high to Craft, and can't be
    chosen; the arrow keys skip them. A note under the box credits AoN
    and, once the item data has loaded (when the box is first focused),
    gives the date of the copy. If the item data can't be loaded, a
    message says so and the level and Price can still be entered by
    hand.

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

* Appearance: a modern steampunk theme over a fixed parchment blueprint
  backdrop, softened by a wash of the page colour (heavier in dark mode)
  so text stays readable. Each panel looks like a sheet of old paper:
  fibre grain and mottling, a couple of age stains (placed differently
  per panel), edges darkened as if aged and slightly uneven corners. In
  dark mode the paper is a dim, aged brown. Brass and copper are used as
  accents (brass sliders and focus rings). The title and panel headers
  use New Rocker, a hammered blackletter display face; other headings
  and key figures use a serif; body text uses the system sans-serif. Light and
  dark modes follow the system.

* Layout: three panels. Crafter holds the rules version, Crafting
  proficiency, Crafting bonus and character level. Item holds the item
  search, item level, item Price and the formula, Specialty Crafting and
  Impeccable Crafting checkboxes. Results holds the outputs and the
  additional days spent. On a wide screen the three sit side by side and
  everything fits a 1920x1080 window without scrolling; on a medium screen
  Crafter and Item stack beside Results; on a narrow screen all three
  stack.

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

* Specialty Crafting: when the feat applies, the Crafting check gets a +1
  circumstance bonus, or +2 if the crafter is a master (or legendary) in
  Crafting. The app shows the bonus used for the check. Partial bonuses
  for items that only partly fit the specialty are left to the user.

* Impeccable Crafting: a rolled success becomes a critical success. The
  odds add the success chance to the critical success chance, and the
  Success column uses the critical success figures (marked as counting as
  critical). The additional days slider is then limited by the critical
  success max.

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
