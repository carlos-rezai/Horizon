/**
 * How many leading tokens a Counterparty Key keeps. Enough to tell payees
 * apart, few enough that trailing reference noise (cities, card suffixes,
 * order numbers) never splits one payee into many keys. Tuned against the
 * anonymised fixture exports.
 */
export const COUNTERPARTY_KEY_TOKENS = 3;

/** Tokens shorter than this many characters are noise ("e.K.", initials). */
const MIN_TOKEN_LENGTH = 2;

/**
 * Normalise a raw Counterparty into the Counterparty Key a Category Rule is
 * keyed on: NFKC, lowercase, every run of non-letters (digits, dates, branch
 * numbers, punctuation, whitespace) becomes a token break, tokens under two
 * letters are dropped, and the first {@link COUNTERPARTY_KEY_TOKENS} tokens are
 * joined by single spaces. The empty string means "no key". Idempotent.
 */
export function counterpartyKey(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
    .slice(0, COUNTERPARTY_KEY_TOKENS)
    .join(" ");
}
