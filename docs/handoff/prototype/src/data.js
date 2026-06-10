/* ============================================================
   HORIZON — mock domain data + projection generator
   Money in CENTS (integers). Dates ISO. de-DE formatting.
   Mirrors the real Recurring-Only Projection Model.
   Exposes window.HZ
   ============================================================ */
(function () {
  const eur = (cents, opts = {}) => {
    const v = cents / 100;
    const s = v.toLocaleString("de-DE", {
      minimumFractionDigits: opts.cents === false ? 0 : 2,
      maximumFractionDigits: opts.cents === false ? 0 : 2,
    });
    return opts.sign && v > 0 ? "+" + s : s;
  };
  const eurUnit = (cents, opts) => eur(cents, opts) + " €";

  /* --- Accounts ------------------------------------------------ */
  const accounts = [
    {
      id: "a1",
      name: "Main",
      kind: "Girokonto",
      sub: "Checking · primary",
      balance: 248055,
      color: "#7FA7D9",
      icon: "landmark",
      openingDate: "2025-01-01",
      showInTrajectory: true,
    },
    {
      id: "a2",
      name: "Tagesgeld",
      kind: "Tagesgeld",
      sub: "Savings · 1.2% APY · ST reserve",
      balance: 1820000,
      color: "#74C29B",
      icon: "piggy",
      openingDate: "2025-01-01",
      showInTrajectory: true,
    },
    {
      id: "a3",
      name: "Sparkasse",
      kind: "Girokonto",
      sub: "Checking · secondary",
      balance: 64020,
      color: "#909AAE",
      icon: "building",
      openingDate: "2025-03-01",
      showInTrajectory: true,
    },
    {
      id: "a4",
      name: "Mortgage",
      kind: "Mortgage",
      sub: "3.45% · Restschuld",
      balance: 9000000,
      color: "#CE8278",
      icon: "home",
      openingDate: "2025-01-01",
      interest: 3.45,
      stAllowance: 2000000,
    },
    {
      id: "a5",
      name: "ETF Portfolio",
      kind: "Investment",
      sub: "Cost basis",
      balance: 850000,
      color: "#B79CE0",
      icon: "trend",
      openingDate: "2025-01-01",
      showInTrajectory: true,
    },
    {
      id: "a6",
      name: "Visa",
      kind: "CreditCard",
      sub: "Settles monthly → Main",
      balance: -42030,
      color: "#5FB8C0",
      icon: "card",
      openingDate: "2025-02-01",
      linked: "a1",
      showInTrajectory: false,
    },
  ];
  const accountById = (id) => accounts.find((a) => a.id === id);

  const LIQUID_KINDS = ["Girokonto", "Tagesgeld"];
  const totalLiquid = accounts
    .filter((a) => LIQUID_KINDS.includes(a.kind))
    .reduce((s, a) => s + a.balance, 0);
  const restschuld = accountById("a4").balance;

  /* --- Recurring transactions (drive the engine) -------------- */
  const recurring = [
    {
      id: "r1",
      label: "Salary",
      account: "a1",
      amount: 412000,
      freq: "Monthly",
      day: 1,
      category: "Income",
    },
    {
      id: "r2",
      label: "Rent",
      account: "a1",
      amount: -148000,
      freq: "Monthly",
      day: 1,
      category: "Housing",
    },
    {
      id: "r3",
      label: "Darlehen (Zinsen + Tilgung)",
      account: "a1",
      amount: -92000,
      freq: "Monthly",
      day: 1,
      category: "Mortgage",
    },
    {
      id: "r4",
      label: "Savings rate → Tagesgeld",
      account: "a1",
      linked: "a2",
      amount: -120000,
      freq: "Monthly",
      day: 2,
      category: "Transfer",
    },
    {
      id: "r5",
      label: "Sondertilgung → Mortgage",
      account: "a2",
      linked: "a4",
      amount: -1800000,
      freq: "Annual",
      monthOfYear: 10,
      category: "Sondertilgung",
    },
    {
      id: "r6",
      label: "ETF plan",
      account: "a1",
      linked: "a5",
      amount: -50000,
      freq: "Monthly",
      day: 5,
      category: "Invest",
    },
    {
      id: "r7",
      label: "Electricity & Internet",
      account: "a1",
      amount: -16500,
      freq: "Monthly",
      day: 15,
      category: "Utilities",
    },
    {
      id: "r8",
      label: "Insurance",
      account: "a1",
      amount: -8900,
      freq: "Quarterly",
      monthOfYear: 1,
      category: "Insurance",
    },
  ];

  /* --- Categories (for Month Overview breakdown) -------------- */
  const categories = [
    { key: "Groceries", label: "Groceries", color: "#74C29B" },
    { key: "Dining", label: "Dining", color: "#E0A86B" },
    { key: "Transport", label: "Transport", color: "#7FA7D9" },
    { key: "Shopping", label: "Shopping", color: "#B79CE0" },
    { key: "Health", label: "Health", color: "#5FB8C0" },
    { key: "Cat", label: "Cat", color: "#C7AE57" },
    { key: "Misc", label: "Misc", color: "#909AAE" },
  ];

  /* --- Variable spending for current month (Nov 2026) --------- */
  const variableSpending = [
    {
      id: "t1",
      date: "2026-11-02",
      account: "a1",
      label: "REWE groceries",
      category: "Groceries",
      amount: -8742,
    },
    {
      id: "t2",
      date: "2026-11-03",
      account: "a6",
      label: "Restaurant Mitte",
      category: "Dining",
      amount: -6400,
    },
    {
      id: "t3",
      date: "2026-11-05",
      account: "a1",
      label: "BVG monthly pass",
      category: "Transport",
      amount: -4900,
    },
    {
      id: "t4",
      date: "2026-11-07",
      account: "a6",
      label: "Zalando",
      category: "Shopping",
      amount: -11930,
    },
    {
      id: "t5",
      date: "2026-11-09",
      account: "a1",
      label: "Fressnapf — cat food",
      category: "Cat",
      amount: -3420,
    },
    {
      id: "t6",
      date: "2026-11-11",
      account: "a1",
      label: "dm drugstore",
      category: "Health",
      amount: -2615,
    },
    {
      id: "t7",
      date: "2026-11-14",
      account: "a6",
      label: "Edeka",
      category: "Groceries",
      amount: -5380,
    },
    {
      id: "t8",
      date: "2026-11-18",
      account: "a1",
      label: "Vet",
      category: "Cat",
      amount: -8900,
    },
    {
      id: "t9",
      date: "2026-11-21",
      account: "a6",
      label: "Saturn — headphones",
      category: "Shopping",
      amount: -14999,
    },
    {
      id: "t10",
      date: "2026-11-24",
      account: "a1",
      label: "Pharmacy",
      category: "Health",
      amount: -1840,
    },
    {
      id: "t11",
      date: "2026-11-26",
      account: "a1",
      label: "Bakery",
      category: "Dining",
      amount: -1280,
    },
    {
      id: "t12",
      date: "2026-11-28",
      account: "a6",
      label: "Gas station",
      category: "Transport",
      amount: -7210,
    },
  ];

  /* --- Projection engine: 240-month horizon ------------------- */
  // Anchored "today" = Nov 2026 for the prototype.
  const START_YEAR = 2026,
    START_MONTH = 0; // Jan 2026
  const HORIZON = 240;
  const monthlyNetToLiquid = 145000; // net flow into liquid accounts / month (cents)
  const annualST = 1800000; // Sondertilgung each October
  const stMonthIndexInYear = 9; // October (0-based)

  function buildProjection() {
    const pts = [];
    // Per-account starting balances (Jan 2026, cents). Anchored so that the
    // "today" snapshot (index 10 = Nov 2026) lands near each account's current balance.
    let a1 = 150000; // Hauptkonto (checking) — drifts up, oscillates
    let a3 = 50000; // Sparkasse (secondary checking) — nearly flat
    let a2 = 1750000; // Tagesgeld (ST reserve) — sparrate in, ST out each Oct
    let a5 = 230000; // ETF Depot (investment) — sparplan + appreciation
    let a6 = -42030; // Visa (credit card) — settles monthly, oscillates near 0
    let debt = 10800000; // Restschuld → clears Oct 2031
    let payoffIndex = -1;
    for (let i = 0; i < HORIZON; i++) {
      const year = START_YEAR + Math.floor((START_MONTH + i) / 12);
      const month = (START_MONTH + i) % 12;
      const isST = month === stMonthIndexInYear && debt > 0;
      const freedomNow = payoffIndex !== -1 && i > payoffIndex;

      // monthly flows
      a1 += 7000 + Math.round(Math.sin(i / 2.6) * 12000); // checking: small drift + texture
      a3 += 1400; // secondary: nearly flat
      a2 += 170000 + (freedomNow ? 210000 : 0); // Tagesgeld sparrate (boosted post-payoff)
      a5 += 62000 + Math.round(i * 220) + (freedomNow ? 45000 : 0); // ETF: sparplan + growth, accelerates post-payoff
      a6 = -42030 + Math.round(Math.sin(i / 1.7) * 22000); // credit card oscillation

      let pay = 0;
      if (isST) {
        pay = Math.min(annualST, debt);
        debt -= pay;
        a2 -= pay;
      } // ST pulls from Tagesgeld
      const justPaidOff = debt <= 0 && payoffIndex === -1;
      if (justPaidOff) payoffIndex = i;
      const freedom = payoffIndex !== -1 && i >= payoffIndex;

      const totalLiquid = a1 + a2 + a3;
      const net =
        145000 +
        Math.round((i % 4) * 5200 - 7000) +
        (freedom ? Math.round((annualST / 12) * 0.62) : 0);
      pts.push({
        i,
        year,
        month,
        date: `${year}-${String(month + 1).padStart(2, "0")}`,
        a1: Math.max(0, a1),
        a2: Math.max(0, a2),
        a3: Math.max(0, a3),
        a5: Math.max(0, a5),
        a6,
        totalLiquid: Math.max(0, totalLiquid),
        restschuld: Math.max(0, debt),
        netCashflow: net,
        isSTMonth: isST,
        isPayoffMonth: justPaidOff,
        freedom,
      });
    }
    return { pts, payoffIndex };
  }

  const projection = buildProjection();
  const payoff = projection.pts[projection.payoffIndex];

  // Year summaries (December snapshot per year, + ST fired that year)
  const yearSummaries = [];
  for (let y = 0; y < 20; y++) {
    const year = START_YEAR + y;
    const dec = projection.pts.filter((p) => p.year === year).slice(-1)[0];
    if (!dec) break;
    const stFired = projection.pts
      .filter((p) => p.year === year && p.isSTMonth)
      .reduce((s) => s + annualST, 0);
    const isPayoffYear = projection.pts.some(
      (p) => p.year === year && p.isPayoffMonth
    );
    yearSummaries.push({
      year,
      totalLiquid: dec.totalLiquid,
      restschuld: dec.restschuld,
      st: stFired,
      isPayoffYear,
    });
  }

  // Months remaining to payoff (anchored at Nov 2026 = index 10)
  const TODAY_INDEX = 10; // Nov 2026
  const monthsToPayoff = projection.payoffIndex - TODAY_INDEX;

  /* --- Bank CSV presets (remembered column mappings) ---------- */
  const bankPresets = {
    Sparkasse: {
      columns: [
        "Buchungstag",
        "Verwendungszweck",
        "Beguenstigter/Zahlungspflichtiger",
        "Betrag",
        "Waehrung",
      ],
      map: { date: "Buchungstag", desc: "Verwendungszweck", amount: "Betrag" },
      decimal: ",",
      dateFmt: "DD.MM.YYYY",
    },
    DKB: {
      columns: [
        "Buchungsdatum",
        "Auftraggeber / Begünstigter",
        "Verwendungszweck",
        "Betrag (€)",
      ],
      map: {
        date: "Buchungsdatum",
        desc: "Verwendungszweck",
        amount: "Betrag (€)",
      },
      decimal: ",",
      dateFmt: "DD.MM.YYYY",
    },
    ING: {
      columns: [
        "Buchung",
        "Auftraggeber/Empfänger",
        "Verwendungszweck",
        "Betrag",
        "Saldo",
      ],
      map: { date: "Buchung", desc: "Verwendungszweck", amount: "Betrag" },
      decimal: ",",
      dateFmt: "DD.MM.YYYY",
    },
  };
  const accountBank = { a1: "DKB", a3: "Sparkasse", a6: "ING" };

  /* --- Seeded import history --------------------------------- */
  // Representative parsed rows per statement (for Preview + re-import preview).
  const mkTxns = (acct, year, seed) => {
    const base = [
      { desc: "REWE SAGT DANKE", cat: "Groceries", amt: -6284 },
      {
        desc: "Gehalt Arbeitgeber GmbH",
        cat: "Income",
        amt: 412000,
        recurring: true,
      },
      {
        desc: "Miete Hausverwaltung",
        cat: "Housing",
        amt: -148000,
        recurring: true,
      },
      { desc: "AMZN Mktp DE", cat: "Shopping", amt: -4799 },
      { desc: "DM FIL. 4021", cat: "Health", amt: -2237 },
      { desc: "Shell Tankstelle", cat: "Transport", amt: -7140 },
      { desc: "Fressnapf Tiernahrung", cat: "Cat", amt: -3420 },
      { desc: "Netflix.com", cat: "Misc", amt: -1799, recurring: true },
      { desc: "Edeka Muenchen", cat: "Groceries", amt: -5512 },
      { desc: "Restaurant Da Vinci", cat: "Dining", amt: -8650 },
    ];
    return base.map((b, i) => ({
      ...b,
      id: `${acct}-${year}-${seed}-${i}`,
      date: `${year}-${String((seed % 12) + 1).padStart(2, "0")}-${String(i * 2 + 3).padStart(2, "0")}`,
    }));
  };
  const importHistory = [
    {
      id: "f1",
      account: "a1",
      bank: "DKB",
      filename: "DKB_Giro_2026-10.csv",
      year: 2026,
      from: "2026-10-01",
      to: "2026-10-31",
      count: 84,
      importedOn: "2026-11-02",
      sizeKB: 21,
      txns: mkTxns("a1", 2026, 10),
    },
    {
      id: "f2",
      account: "a1",
      bank: "DKB",
      filename: "DKB_Giro_2026-09.csv",
      year: 2026,
      from: "2026-09-01",
      to: "2026-09-30",
      count: 78,
      importedOn: "2026-10-03",
      sizeKB: 19,
      txns: mkTxns("a1", 2026, 9),
    },
    {
      id: "f3",
      account: "a6",
      bank: "ING",
      filename: "ING_Visa_2026-Q3.csv",
      year: 2026,
      from: "2026-07-01",
      to: "2026-09-30",
      count: 142,
      importedOn: "2026-10-04",
      sizeKB: 38,
      txns: mkTxns("a6", 2026, 8),
    },
    {
      id: "f4",
      account: "a3",
      bank: "Sparkasse",
      filename: "Sparkasse_Umsatz_2026-H1.csv",
      year: 2026,
      from: "2026-01-01",
      to: "2026-06-30",
      count: 61,
      importedOn: "2026-07-08",
      sizeKB: 17,
      txns: mkTxns("a3", 2026, 5),
    },
    {
      id: "f5",
      account: "a1",
      bank: "DKB",
      filename: "DKB_Giro_2025-full.csv",
      year: 2025,
      from: "2025-01-01",
      to: "2025-12-31",
      count: 921,
      importedOn: "2026-01-12",
      sizeKB: 192,
      txns: mkTxns("a1", 2025, 6),
    },
    {
      id: "f6",
      account: "a6",
      bank: "ING",
      filename: "ING_Visa_2025-H2.csv",
      year: 2025,
      from: "2025-07-01",
      to: "2025-12-31",
      count: 203,
      importedOn: "2026-01-12",
      sizeKB: 54,
      txns: mkTxns("a6", 2025, 11),
    },
    {
      id: "f7",
      account: "a3",
      bank: "Sparkasse",
      filename: "Sparkasse_Umsatz_2025.csv",
      year: 2025,
      from: "2025-01-01",
      to: "2025-12-31",
      count: 148,
      importedOn: "2026-01-13",
      sizeKB: 41,
      txns: mkTxns("a3", 2025, 4),
    },
  ];

  window.HZ = {
    eur,
    eurUnit,
    accounts,
    accountById,
    totalLiquid,
    restschuld,
    LIQUID_KINDS,
    // Mortgage origination meta (user-editable): principal at start + start date.
    // Defaults reflect a mortgage already ~3 years in, so "% paid off" is never a false 0%.
    mortgage: {
      originalPrincipal: 15000000,
      startDate: "2023-03-01",
      termYears: 15,
    },
    recurring,
    categories,
    variableSpending,
    bankPresets,
    accountBank,
    importHistory,
    projection: projection.pts,
    payoffIndex: projection.payoffIndex,
    payoff,
    yearSummaries,
    monthsToPayoff,
    TODAY_INDEX,
    today: { year: 2026, month: 10, label: "November 2026" },
  };
})();
