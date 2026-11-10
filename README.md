# Craftalator

A calculator for the time and cost of crafting items in the Pathfinder
Second Edition roleplaying game. It supports both the Remaster (Player Core)
and Legacy (Core Rulebook) rules.

![Craftalator's Crafter, Item and Results panels, calculating the cost
and time for a master crafter to make an Elixir of Life
(Moderate)](example.webp)

Enter the crafter's level, Crafting proficiency and bonus, and the item's
level and Price. Craftalator shows:

- the initial cost of raw materials and the days of setup needed,
- the Crafting check DC and the chance of each degree of success,
- how many additional days it takes to finish the item for free, and
- the remaining cost to finish early after any number of additional days,
  for both a success and a critical success.

The app runs entirely in your browser. It has no server, no accounts, no
tracking and stores nothing.

See [SPEC.md](SPEC.md) for the full feature list and the crafting rules the
app follows.

## Development

Requires either [Node.js](https://nodejs.org/) (current LTS) or
[Bun](https://bun.sh/).

| Task                          | Node.js             | Bun                 |
| ----------------------------- | ------------------- | ------------------- |
| Install dependencies          | `npm install`       | `bun install`       |
| Dev server with hot reload    | `npm run dev`       | `bun run dev`       |
| Run unit tests (Vitest)       | `npm test`          | `bun run test`      |
| ESLint and Prettier checks    | `npm run lint`      | `bun run lint`      |
| TypeScript type check         | `npm run typecheck` | `bun run typecheck` |
| Production build into `dist/` | `npm run build`     | `bun run build`     |
| Preview the production build  | `npm run preview`   | `bun run preview`   |

With Bun, use `bun run test`, not `bun test`. `bun test` starts Bun's
built-in test runner rather than Vitest, and the tests won't run correctly.

Debug logging is on in dev builds. In a production build, add `?debug=1` to
the URL to turn it on.

Architecture and coding conventions are described in
[CLAUDE.md](CLAUDE.md).

## License

Released under the [MIT License](LICENSE).

Pathfinder is a trademark of Paizo Inc. Craftalator is an independent
project and is not published, endorsed or approved by Paizo Inc.
