/**
 * The item snapshot is validated at runtime (see src/items.ts), so it is
 * typed as unknown rather than letting TypeScript infer its huge shape.
 */
declare module '*/data/items.json' {
  const data: unknown;
  export default data;
}
