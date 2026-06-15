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
] as const;

export function colorForCategoryName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return categoryColorPalette[hash % categoryColorPalette.length];
}
