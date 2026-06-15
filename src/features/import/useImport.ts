import { useMemo, useState } from "react";
import type { AccountKind, AccountWithBalance } from "../../types/account";
import { createPresetMemory, type PresetMemory } from "./presetMemory";
import { DEFAULT_BANK } from "./bankPresets";
import type { ImportedStatement } from "./importTypes";
import type { ParsedImportRow } from "./reviewRows";

/** Account kinds that can receive imported bank statements. */
const IMPORTABLE_KINDS = new Set<AccountKind>([
  "Girokonto",
  "CreditCard",
  "Tagesgeld",
]);

/**
 * Representative parsed rows for the wizard's review step.
 *
 * This stands in for the deferred CSV parse + duplicate/recurring detection
 * engine. It is the single swap point: the "CSV / Bank Statement Import
 * (backend)" epic replaces this with real parser output.
 */
export function sampleParsedRows(): ParsedImportRow[] {
  return [
    {
      id: "i1",
      date: "2026-11-02",
      desc: "REWE SAGT DANKE",
      amount: -6284,
      cat: "Groceries",
    },
    {
      id: "i2",
      date: "2026-11-01",
      desc: "Gehalt Arbeitgeber GmbH",
      amount: 412000,
      cat: "Income",
      recurring: true,
    },
    {
      id: "i3",
      date: "2026-11-01",
      desc: "Miete Hausverwaltung",
      amount: -148000,
      cat: "Housing",
      recurring: true,
    },
    {
      id: "i4",
      date: "2026-11-03",
      desc: "Restaurant Mitte",
      amount: -6400,
      cat: "Dining",
      duplicate: true,
    },
    {
      id: "i5",
      date: "2026-11-05",
      desc: "BVG Monatskarte",
      amount: -4900,
      cat: "Transport",
      duplicate: true,
    },
    {
      id: "i6",
      date: "2026-11-07",
      desc: "AMZN Mktp DE",
      amount: -4799,
      cat: "Shopping",
    },
    {
      id: "i7",
      date: "2026-11-09",
      desc: "Fressnapf Tiernahrung",
      amount: -3420,
      cat: "Cat",
    },
    {
      id: "i8",
      date: "2026-11-11",
      desc: "Netflix.com",
      amount: -1799,
      cat: "Misc",
      recurring: true,
    },
    {
      id: "i9",
      date: "2026-11-14",
      desc: "Edeka Muenchen",
      amount: -5512,
      cat: "Groceries",
    },
    {
      id: "i10",
      date: "2026-11-15",
      desc: "Sparplan ETF",
      amount: -50000,
      cat: "Invest",
      recurring: true,
    },
    {
      id: "i11",
      date: "2026-11-18",
      desc: "DM FIL. 4021",
      amount: -2237,
      cat: "Health",
    },
    {
      id: "i12",
      date: "2026-11-21",
      desc: "Shell Tankstelle",
      amount: -7140,
      cat: "Transport",
    },
  ];
}

interface SeedTemplate {
  bank: string;
  filename: string;
  year: number;
  from: string;
  to: string;
  count: number;
  importedOn: string;
  sizeKB: number;
}

const SEED_TEMPLATES: SeedTemplate[] = [
  {
    bank: "DKB",
    filename: "DKB_Giro_2026-10.csv",
    year: 2026,
    from: "2026-10-01",
    to: "2026-10-31",
    count: 84,
    importedOn: "2026-11-02",
    sizeKB: 21,
  },
  {
    bank: "DKB",
    filename: "DKB_Giro_2026-09.csv",
    year: 2026,
    from: "2026-09-01",
    to: "2026-09-30",
    count: 78,
    importedOn: "2026-10-03",
    sizeKB: 19,
  },
  {
    bank: "ING",
    filename: "ING_Visa_2026-Q3.csv",
    year: 2026,
    from: "2026-07-01",
    to: "2026-09-30",
    count: 142,
    importedOn: "2026-10-04",
    sizeKB: 38,
  },
  {
    bank: "Sparkasse",
    filename: "Sparkasse_Umsatz_2026-H1.csv",
    year: 2026,
    from: "2026-01-01",
    to: "2026-06-30",
    count: 61,
    importedOn: "2026-07-08",
    sizeKB: 17,
  },
  {
    bank: "DKB",
    filename: "DKB_Giro_2025-full.csv",
    year: 2025,
    from: "2025-01-01",
    to: "2025-12-31",
    count: 921,
    importedOn: "2026-01-12",
    sizeKB: 192,
  },
  {
    bank: "ING",
    filename: "ING_Visa_2025-H2.csv",
    year: 2025,
    from: "2025-07-01",
    to: "2025-12-31",
    count: 203,
    importedOn: "2026-01-12",
    sizeKB: 54,
  },
  {
    bank: "Sparkasse",
    filename: "Sparkasse_Umsatz_2025.csv",
    year: 2025,
    from: "2025-01-01",
    to: "2025-12-31",
    count: 148,
    importedOn: "2026-01-13",
    sizeKB: 41,
  },
];

const PREVIEW_TXNS: ReadonlyArray<{
  desc: string;
  cat: string;
  amount: number;
}> = [
  { desc: "REWE SAGT DANKE", cat: "Groceries", amount: -6284 },
  { desc: "Gehalt Arbeitgeber GmbH", cat: "Income", amount: 412000 },
  { desc: "Miete Hausverwaltung", cat: "Housing", amount: -148000 },
  { desc: "AMZN Mktp DE", cat: "Shopping", amount: -4799 },
  { desc: "DM FIL. 4021", cat: "Health", amount: -2237 },
  { desc: "Shell Tankstelle", cat: "Transport", amount: -7140 },
  { desc: "Fressnapf Tiernahrung", cat: "Cat", amount: -3420 },
  { desc: "Netflix.com", cat: "Misc", amount: -1799 },
];

/**
 * Builds representative import history mapped onto the user's real
 * importable accounts. Stands in for persisted history until the CSV
 * Import backend epic ships; an account with no imports shows the empty
 * state.
 */
function buildSeedHistory(
  importAccounts: AccountWithBalance[]
): ImportedStatement[] {
  if (importAccounts.length === 0) return [];
  return SEED_TEMPLATES.map((tpl, i) => {
    const account = importAccounts[i % importAccounts.length];
    return {
      id: `seed-${i}`,
      accountId: account.id,
      bank: tpl.bank,
      filename: tpl.filename,
      year: tpl.year,
      from: tpl.from,
      to: tpl.to,
      count: tpl.count,
      importedOn: tpl.importedOn,
      sizeKB: tpl.sizeKB,
      txns: PREVIEW_TXNS.map((t, j) => ({
        id: `seed-${i}-${j}`,
        date: `${tpl.year}-${String((i % 12) + 1).padStart(2, "0")}-${String(j * 2 + 3).padStart(2, "0")}`,
        desc: t.desc,
        cat: t.cat,
        amount: t.amount,
      })),
    };
  });
}

interface UseImportResult {
  importAccounts: AccountWithBalance[];
  history: ImportedStatement[];
  presetMemory: PresetMemory;
  /** Best-guess bank for an account; falls back to {@link DEFAULT_BANK}. */
  detectBank: (accountId: string) => string;
}

export function useImport(accounts: AccountWithBalance[]): UseImportResult {
  // Lazy state keeps one PresetMemory instance stable across renders.
  const [presetMemory] = useState<PresetMemory>(() => createPresetMemory());

  const importAccounts = useMemo(
    () => accounts.filter((a) => IMPORTABLE_KINDS.has(a.kind)),
    [accounts]
  );

  const history = useMemo(
    () => buildSeedHistory(importAccounts),
    [importAccounts]
  );

  const detectBank = (accountId: string): string => {
    const stmt = history.find((h) => h.accountId === accountId);
    return stmt ? stmt.bank : DEFAULT_BANK;
  };

  return {
    importAccounts,
    history,
    presetMemory,
    detectBank,
  };
}
