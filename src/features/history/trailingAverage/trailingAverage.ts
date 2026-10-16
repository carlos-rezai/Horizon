/**
 * The trailing average behind the History Trends average line: the mean of
 * the known (non-null) values among the last `window` months, rounded to whole
 * cents. Values are oldest first; null is an Unknown month. Null when the
 * window holds no known month.
 */
export function trailingAverage(
  values: (number | null)[],
  window = 12
): number | null {
  const known = values
    .slice(Math.max(0, values.length - window))
    .filter((v): v is number => v !== null);
  if (known.length === 0) return null;
  return Math.round(known.reduce((sum, v) => sum + v, 0) / known.length);
}
