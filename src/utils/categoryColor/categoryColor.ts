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

// The canonical breakdown categories carry hand-authored swatches (from the
// handoff prototype) so the Month Overview donut + badges read 1:1. Every value
// is a member of categoryColorPalette, so categories and accounts still share
// one visual language. Any name outside this map hashes deterministically.
export const fixedCategoryColors: Record<string, string> = {
  Groceries: "#74C29B", // sage
  Dining: "#E0A86B", // clay
  Transport: "#7FA7D9", // steel
  Shopping: "#B79CE0", // lilac
  Health: "#5FB8C0", // teal
  Cat: "#C7AE57", // ochre
  Misc: "#909AAE", // slate
};

export function colorForCategoryName(name: string): string {
  const fixed = fixedCategoryColors[name];
  if (fixed !== undefined) return fixed;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return categoryColorPalette[hash % categoryColorPalette.length];
}
