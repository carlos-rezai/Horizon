import { describe, it, expect } from "vitest";
import { counterpartyKey as clientKey } from "./counterpartyKey";
// The server owns the Counterparty Key: it re-derives every key on commit and
// never trusts one from the client. The client keeps a mirror only so the
// review step can tell which rows share a payee for Same-Counterparty
// Propagation. If the two ever diverge, propagation groups rows the server
// would key apart (or the reverse) — this guard fails the build if they do.
import { counterpartyKey as serverKey } from "../../../server/src/lib/csvImport/counterpartyKey";

/** Raw counterparties covering every normalisation rule the server applies. */
const inputs: string[] = [
  "REWE",
  "Rewe Markt GmbH",
  "REWE Markt GmbH 4711 Berlin",
  "ＲＥＷＥ",
  "ﬁtness First",
  "REWE123",
  "24.06.2026 REWE",
  "2026-06-24 REWE",
  "AMAZON EU S.A.R.L., 302-1234567-7654321",
  "Amazon EU S.a.r.l. 028-9876543-1234567",
  "PayPal (Europe) S.a r.l. et Cie, S.C.A.",
  "Bäckerei Müller e.K.",
  "Straßenbahn Öffentlicher Verkehr Süd",
  "  lots   of   spaces  ",
  "DB Vertrieb GmbH / Fahrkarte",
  "12345",
  "",
  "!!!---",
];

describe("counterpartyKey client mirror (issue #263)", () => {
  it.each(inputs)("keys %j exactly as the server does", (raw) => {
    expect(clientKey(raw)).toBe(serverKey(raw));
  });

  it("is idempotent, like the server key", () => {
    for (const raw of inputs) {
      expect(clientKey(clientKey(raw))).toBe(clientKey(raw));
    }
  });
});
