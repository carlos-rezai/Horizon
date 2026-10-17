/**
 * Client mirror of the server's Counterparty Key
 * (`server/src/lib/csvImport/counterpartyKey.ts`). The server owns the key and
 * re-derives it on commit; the review step uses this mirror only to group rows
 * for Same-Counterparty Propagation. A parity test keeps the two in step.
 */

/** How many leading tokens a Counterparty Key keeps. */
const COUNTERPARTY_KEY_TOKENS = 3;

/** Tokens shorter than this many characters are noise ("e.K.", initials). */
const MIN_TOKEN_LENGTH = 2;

/**
 * NFKC, lowercase, every run of non-letters becomes a token break, tokens
 * under two letters are dropped, and the first three tokens are joined by
 * single spaces. The empty string means "no key". Idempotent.
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
