/**
 * The registry of every key the app cache holds.
 *
 * A cached read and the mutation that invalidates it have to name the same
 * key, and nothing but this file enforces that they do. Reading through
 * `useCachedResource` and bumping through `useCacheBump` both take `CacheKey`,
 * so a mistyped or unregistered key is a compile error rather than a silent
 * stale view — the failure mode where `bump("accont")` no-ops and a screen
 * keeps showing old numbers with no error anywhere.
 *
 * It doubles as documentation: this is the one place that answers "what does
 * the cache hold, and what may a mutation invalidate?".
 */

/** The whole-app account list with balances. */
export const ACCOUNTS = "accounts";
/** The multi-decade balance/mortgage projection. */
export const PROJECTION = "projection";
/** The editable transaction-Category list. */
export const CATEGORIES = "categories";
/** Every recurring transaction across all accounts. */
export const RECURRING = "recurring";

/** The four fixed, whole-app resource keys. */
type GlobalResourceKey =
  | typeof ACCOUNTS
  | typeof PROJECTION
  | typeof CATEGORIES
  | typeof RECURRING;

/**
 * Brands the dynamic per-month transaction keys so they satisfy `CacheKey`
 * without widening it back to every `string`. Only `monthTransactionsKey`
 * mints one.
 */
type MonthTransactionsKey = string & {
  readonly __brand: "monthTransactionsKey";
};

/** Any key the cache recognises: a fixed resource, or a per-month key. */
export type CacheKey = GlobalResourceKey | MonthTransactionsKey;

/**
 * Cache key for a month's transactions on a given set of accounts.
 *
 * Keying on the accounts *and* the month is what makes stepping back to a
 * month you already looked at instant: each pair keeps its own entry, so a
 * revisit paints from cache instead of refetching. A single-account read and
 * a one-account aggregate read produce the same key on purpose — they are the
 * same request.
 */
export function monthTransactionsKey(
  accountIds: readonly string[],
  month: string
): MonthTransactionsKey {
  return `transactions:${accountIds.join(",")}:${month}` as MonthTransactionsKey;
}
