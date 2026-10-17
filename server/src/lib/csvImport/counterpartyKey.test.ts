import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { COUNTERPARTY_KEY_TOKENS, counterpartyKey } from "./counterpartyKey.js";
import { detectStatement, mapStatementRows } from "./detectStatement.js";

// The Counterparty Key is what a Category Rule is keyed on: the raw
// Counterparty normalised so that the same payee keys the same way across
// statements, whatever reference noise the bank printed around it. Tested only
// through the returned key.

/** The expected key for a list of already-normalised tokens, honouring the cap. */
const keyOf = (tokens: string[]): string =>
  tokens.slice(0, COUNTERPARTY_KEY_TOKENS).join(" ");

describe("counterpartyKey", () => {
  it("caps the key at a small positive number of tokens", () => {
    expect(Number.isInteger(COUNTERPARTY_KEY_TOKENS)).toBe(true);
    expect(COUNTERPARTY_KEY_TOKENS).toBeGreaterThanOrEqual(1);
  });

  it("lowercases, so case never splits one payee into two keys", () => {
    expect(counterpartyKey("REWE")).toBe("rewe");
    expect(counterpartyKey("Rewe")).toBe(counterpartyKey("rEWE"));
  });

  it("applies NFKC, so full-width and ligature forms key like plain text", () => {
    expect(counterpartyKey("ＲＥＷＥ")).toBe("rewe");
    expect(counterpartyKey("ﬁtness")).toBe("fitness");
  });

  it("strips digits, including digits glued to letters", () => {
    expect(counterpartyKey("REWE123")).toBe("rewe");
    expect(counterpartyKey("4711 REWE")).toBe("rewe");
  });

  it("strips dates wherever they appear", () => {
    expect(counterpartyKey("24.06.2026 REWE")).toBe("rewe");
    expect(counterpartyKey("2026-06-24 REWE")).toBe("rewe");
    expect(counterpartyKey("REWE 24.06.26")).toBe("rewe");
  });

  it("strips branch numbers, so two branches of one store share a key", () => {
    expect(counterpartyKey("REWE 0815")).toBe(counterpartyKey("REWE 4711"));
    expect(counterpartyKey("REWE 0815")).toBe("rewe");
  });

  it("treats punctuation as a token break", () => {
    expect(counterpartyKey("PayPal *Spotify")).toBe(
      keyOf(["paypal", "spotify"])
    );
    expect(counterpartyKey("AMAZON.DE/MKTP")).toBe(
      keyOf(["amazon", "de", "mktp"])
    );
  });

  it("drops tokens shorter than two letters", () => {
    expect(counterpartyKey("A B REWE")).toBe("rewe");
    expect(counterpartyKey("Rewe e.K.")).toBe("rewe");
  });

  it("keeps two-letter tokens", () => {
    expect(counterpartyKey("DM Markt")).toBe(keyOf(["dm", "markt"]));
  });

  it("joins tokens with single spaces and never pads either end", () => {
    const key = counterpartyKey("  REWE   ---   Markt  ");
    expect(key).toBe(keyOf(["rewe", "markt"]));
    expect(key).not.toMatch(/^\s|\s$|\s\s/);
  });

  it("keeps only the first COUNTERPARTY_KEY_TOKENS tokens", () => {
    const words = [
      "alpha",
      "bravo",
      "charlie",
      "delta",
      "echo",
      "foxtrot",
      "golf",
      "hotel",
    ];
    const key = counterpartyKey(words.join(" "));

    expect(key.split(" ")).toHaveLength(
      Math.min(words.length, COUNTERPARTY_KEY_TOKENS)
    );
    expect(key).toBe(keyOf(words));
  });

  it("preserves umlauts and ß as letters", () => {
    expect(counterpartyKey("MÜLLER BÄCKEREI")).toBe(
      keyOf(["müller", "bäckerei"])
    );
    expect(counterpartyKey("Große Straße")).toBe(keyOf(["große", "straße"]));
  });

  it("composes a decomposed umlaut, so both spellings share a key", () => {
    expect(counterpartyKey("Müller")).toBe(counterpartyKey("Müller"));
    expect(counterpartyKey("Müller")).toBe("müller");
  });

  it("returns an empty key for digits-only input", () => {
    expect(counterpartyKey("123 456")).toBe("");
    expect(counterpartyKey("555-0000000-0000000")).toBe("");
  });

  it("returns an empty key for empty or punctuation-only input", () => {
    expect(counterpartyKey("")).toBe("");
    expect(counterpartyKey("   ")).toBe("");
    expect(counterpartyKey("*** / .")).toBe("");
  });

  it("is idempotent", () => {
    const inputs = [
      "REWE Markt GmbH 0815 24.06.2026",
      "PayPal *Spotify",
      "MÜLLER BÄCKEREI",
      "Müller",
      "ＲＥＷＥ",
      "123 456",
      "Online Bestellung 555-0000000-0000000",
    ];
    for (const input of inputs) {
      const once = counterpartyKey(input);
      expect(counterpartyKey(once)).toBe(once);
    }
  });
});

// ---------------------------------------------------------------------------
// Against the anonymised fixture exports — the token count is tuned here.
// ---------------------------------------------------------------------------

function fixtureDescriptions(name: string): string[] {
  const bytes = readFileSync(
    fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url))
  );
  const detected = detectStatement(bytes);
  return mapStatementRows(detected, detected.mapping).rows.map(
    (row) => row.description
  );
}

describe("counterpartyKey against the fixture exports", () => {
  it("keys the Sparkasse payees by name, without legal-form noise splitting them", () => {
    const keys = fixtureDescriptions("sparkasse-giro.csv").map(counterpartyKey);

    expect(keys).toContain(keyOf(["muster", "supermarkt", "gmbh"]));
    expect(keys).toContain(keyOf(["arbeitgeber", "muster", "ag"]));
  });

  it("drops the postcode and keeps the merchant for Postbank card rows", () => {
    const keys = fixtureDescriptions("postbank-cc.csv").map(counterpartyKey);

    expect(keys).toContain(
      keyOf(["muster", "film", "co", "newtown", "pa", "usa"])
    );
    expect(keys).toContain(keyOf(["sp", "muster", "cat", "berlin", "be"]));
    expect(keys).toContain(keyOf(["müller", "bäckerei"]));
    expect(keys).toContain("auslandseinsatzentgelt");
  });

  it("keeps every fixture row's key non-empty and stable under re-keying", () => {
    const names = [
      "sparkasse-giro.csv",
      "postbank-giro.csv",
      "postbank-cc.csv",
      "renault.csv",
      "windows1252-umlauts.csv",
    ];
    for (const name of names) {
      for (const description of fixtureDescriptions(name)) {
        const key = counterpartyKey(description);
        expect(key, `${name}: ${description}`).not.toBe("");
        expect(counterpartyKey(key)).toBe(key);
      }
    }
  });
});
