// Deterministic category colours (issue #134).
//
// Every Category carries a hex colour derived purely from its name, so the
// same name always maps to the same swatch — stable across reads, across a
// delete + recreate, and across a backup/reopen. The palette mirrors the
// frontend `accountColorPalette` so categories and accounts share one visual
// language. New categories store their derived colour on insert; SQL-seeded
// defaults have no stored colour and fall back to this function at read time.

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
  "#6F9FBF", // dusk
  "#BF6F8F", // mauve
  "#6FBF9F", // jade
  "#BFA36F", // wheat
  "#8FBF6F", // fern
  "#6F8FBF", // denim
  "#BF7F6F", // brick
  "#9F6FBF", // amethyst
  "#6FBFBF", // cyan
  "#BF8F6F", // caramel
] as const;

// The canonical breakdown categories carry hand-authored swatches (from the
// handoff prototype) so the Month Overview donut + badges read 1:1. Every value
// is a member of categoryColorPalette, so categories and accounts still share
// one visual language. Any name outside this map hashes deterministically.
// Kept identical to the frontend mirror in src/utils/categoryColor.
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
