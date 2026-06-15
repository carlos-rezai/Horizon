// Deterministic category colours — the frontend mirror of the server's
// `colorForCategoryName` (issue #134). Every Category's colour is derived purely
// from its name, both here and on the server: SQL-seeded defaults fall back to
// this mapping at read time, and user-created categories persist exactly this
// value on insert. Resolving colour from the name is therefore equivalent to
// reading the `color` column, with no network round-trip for a purely visual
// concern. The palette mirrors `accountColorPalette` so categories and accounts
// share one visual language.

export const categoryColorPalette = [
  "#7FA7D9", // steel
  "#74C29B", // sage
  "#C9897F", // rose
  "#B79CE0", // lilac
  "#E0A86B", // clay
  "#5FB8C0", // teal
  "#C7AE57", // ochre
  "#909AAE", // slate
  "#D08AB0", // pink
  "#9FBF6F", // olive
] as const;

export function colorForCategoryName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return categoryColorPalette[hash % categoryColorPalette.length];
}
