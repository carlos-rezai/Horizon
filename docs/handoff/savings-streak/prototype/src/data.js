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

  /* --- Historical actuals: Jan 2024 → Dec 2025 (reconstructed) --------
     Approximates real monthly closing balances per liquid/investment account
     + Restschuld, landing near the Jan-2026 starting point used by the
     forward projection above. Feeds the History page (multi-year chart +
     year accordion). Not part of the Recurring-Only Projection Model —
     purely a reconstruction of what already happened, from imported CSVs. */
  function buildHistoricalActuals() {
    const pts = [];
    const startYear = 2024,
      months = 24;
    let a1 = 62000,
      a3 = 18000,
      a2 = 640000,
      a5 = 40000,
      a6 = -18000,
      debt = 13200000;
    const targets = { a1: 150000, a3: 50000, a2: 1750000, a5: 230000 };
    const stepA1 = (targets.a1 - a1) / months;
    const stepA3 = (targets.a3 - a3) / months;
    const stepA2 = (targets.a2 - a2) / months;
    const stepA5 = (targets.a5 - a5) / months;
    const annualSTHist = 900000; // smaller Sondertilgung in the earlier mortgage years
    for (let i = 0; i < months; i++) {
      const year = startYear + Math.floor(i / 12);
      const month = i % 12;
      const isST = month === 9 && debt > 0; // October
      a1 += stepA1 + Math.round(Math.sin(i / 2.3) * 6000);
      a3 += stepA3 + Math.round(Math.cos(i / 3.1) * 900);
      a2 += stepA2 + (i > 12 ? 8000 : 0);
      a5 += stepA5 + Math.round(i * 140);
      a6 = -18000 + Math.round(Math.sin(i / 1.6) * 12000);
      if (isST) {
        const pay = Math.min(annualSTHist, debt);
        debt -= pay;
        a2 -= pay;
      }
      debt -= 9200; // routine amortization
      const totalLiquid = a1 + a2 + a3;
      const net = 92000 + Math.round((i % 5) * 3100 - 4200);
      pts.push({
        i: i - months,
        year,
        month,
        date: `${year}-${String(month + 1).padStart(2, "0")}`,
        a1: Math.max(0, Math.round(a1)),
        a2: Math.max(0, Math.round(a2)),
        a3: Math.max(0, Math.round(a3)),
        a5: Math.max(0, Math.round(a5)),
        a6: Math.round(a6),
        totalLiquid: Math.max(0, Math.round(totalLiquid)),
        restschuld: Math.max(0, Math.round(debt)),
        netCashflow: net,
        isSTMonth: isST,
        actual: true,
      });
    }
    return pts;
  }

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

  // Months remaining to payoff (anchored at Jul 2026 = index 6 — today)
  const TODAY_INDEX = 6; // Jul 2026
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
    {
      id: "f8",
      account: "a1",
      bank: "DKB",
      filename: "DKB_Giro_2024-full.csv",
      year: 2024,
      from: "2024-01-01",
      to: "2024-12-31",
      count: 887,
      importedOn: "2025-01-09",
      sizeKB: 181,
      txns: mkTxns("a1", 2024, 6),
    },
    {
      id: "f9",
      account: "a6",
      bank: "ING",
      filename: "ING_Visa_2024-full.csv",
      year: 2024,
      from: "2024-01-01",
      to: "2024-12-31",
      count: 398,
      importedOn: "2025-01-09",
      sizeKB: 96,
      txns: mkTxns("a6", 2024, 3),
    },
    {
      id: "f10",
      account: "a3",
      bank: "Sparkasse",
      filename: "Sparkasse_Umsatz_2024.csv",
      year: 2024,
      from: "2024-01-01",
      to: "2024-12-31",
      count: 132,
      importedOn: "2025-01-10",
      sizeKB: 37,
      txns: mkTxns("a3", 2024, 2),
    },
  ];

  /* --- History: reconstructed actuals (2024–today), grouped by year ---
     Only years with at least one imported statement are included — mirrors
     the real product, where history can only be shown as far back as data
     has been imported. */
  const historicalActuals = buildHistoricalActuals();
  const actualsToToday = projection.pts
    .slice(0, TODAY_INDEX + 1)
    .map((p) => ({ ...p, actual: true })); // Jan–Jul 2026
  const historyPts = [...historicalActuals, ...actualsToToday];
  const historyYears = [...new Set(importHistory.map((f) => f.year))].sort(
    (a, b) => a - b
  );
  const history = { pts: historyPts, years: historyYears };

  /* --- Savings Goal: per-account monthly targets, milestone-derived or manual ---
     "on track" for the streak means every *tracked* account (target > 0)
     met its monthly target that month. Reconstructed from the same actuals
     feeding History. Only liquid + investment accounts are trackable —
     Mortgage/CreditCard don't fit a "save X per month" target. */
  // Display set for the card: all liquid + investment accounts. Which ones
  // are actually tracked (target > 0) is driven by savingsGoalConfig below —
  // Main/Tagesgeld are excluded by default because their monthly balance
  // swings (rate-cycle noise on Main, the annual Sondertilgung draw on
  // Tagesgeld) don't reflect steady savings behavior in this mock.
  const trackableAccountIds = ["a1", "a2", "a3", "a5"];

  function computeSavingsGoal(cfg) {
    const ids = trackableAccountIds;
    const todayIdx = historyPts.length - 1;
    const todayPt = historyPts[todayIdx];
    const monthsToTarget =
      cfg.mode === "milestone"
        ? Math.max(
            1,
            (cfg.targetDate.year - todayPt.year) * 12 +
              (cfg.targetDate.month - todayPt.month)
          )
        : null;

    const monthly = {};
    if (cfg.mode === "milestone") {
      // Weight by each account's own demonstrated average monthly gain
      // (trailing 12 months, positive contributions only) — not raw balance,
      // which can be totally disconnected from how much an account actually
      // moves per month.
      const trailing = 12;
      const weights = {};
      let wSum = 0;
      ids.forEach((id) => {
        let sum = 0,
          n = 0;
        for (
          let i = Math.max(1, historyPts.length - trailing);
          i < historyPts.length;
          i++
        ) {
          const d = historyPts[i][id] - historyPts[i - 1][id];
          if (d > 0) {
            sum += d;
            n++;
          }
        }
        const avg = n > 0 ? sum / n : 0;
        weights[id] = Math.max(avg, 100);
        wSum += weights[id];
      });
      const requiredMonthly = cfg.targetTotal / monthsToTarget;
      ids.forEach((id) => {
        monthly[id] = Math.round(requiredMonthly * (weights[id] / wSum));
      });
    } else {
      ids.forEach((id) => {
        monthly[id] = (cfg.manualMonthly && cfg.manualMonthly[id]) || 0;
      });
    }

    const startIdx = historyPts.findIndex(
      (p) => p.year === cfg.startedAt.year && p.month === cfg.startedAt.month
    );
    const monthsElapsed = startIdx >= 0 ? Math.max(0, todayIdx - startIdx) : 0;

    const perAccount = ids.map((id) => {
      const target = monthly[id] || 0;
      const tracked = target > 0;
      const cumulativeActual =
        tracked && startIdx >= 0
          ? historyPts[todayIdx][id] - historyPts[startIdx][id]
          : 0;
      const cumulativeTarget = tracked ? target * monthsElapsed : 0;
      return { id, target, tracked, cumulativeActual, cumulativeTarget };
    });

    const trackedIds = perAccount.filter((p) => p.tracked).map((p) => p.id);
    const monthlyMet = [];
    for (let i = 1; i < historyPts.length; i++) {
      const allMet =
        trackedIds.length > 0 &&
        trackedIds.every(
          (id) =>
            historyPts[i][id] - historyPts[i - 1][id] >= (monthly[id] || 0)
        );
      monthlyMet.push({
        year: historyPts[i].year,
        month: historyPts[i].month,
        onTrack: allMet,
      });
    }
    let current = 0;
    for (let i = monthlyMet.length - 1; i >= 0; i--) {
      if (monthlyMet[i].onTrack) current++;
      else break;
    }
    let best = 0,
      run = 0;
    monthlyMet.forEach((m) => {
      run = m.onTrack ? run + 1 : 0;
      best = Math.max(best, run);
    });

    // calendar-year strip: Jan → Dec of the current year, future months marked "upcoming"
    const calYear = todayPt.year;
    const yearTicks = [];
    for (let m = 0; m < 12; m++) {
      const idx = historyPts.findIndex(
        (p) => p.year === calYear && p.month === m
      );
      if (idx < 1) {
        yearTicks.push({ year: calYear, month: m, status: "upcoming" });
        continue;
      }
      yearTicks.push({
        year: calYear,
        month: m,
        status: monthlyMet[idx - 1].onTrack ? "met" : "missed",
      });
    }

    return {
      ...cfg,
      monthly,
      monthsToTarget,
      monthsElapsed,
      perAccount,
      streak: { current, best, yearTicks },
    };
  }

  const savingsGoalConfig = {
    mode: "manual",
    targetTotal: 1000000, // €10,000 (used if switched to Milestone mode)
    targetDate: { year: 2028, month: 0 }, // Jan 2028
    startedAt: { year: 2026, month: 0 }, // Jan 2026 — when the goal was set
    // Sparkasse €8/mo, ETF €500/mo — figures the mock's own data generator
    // actually clears most months, so the streak reads as real. Main and
    // Tagesgeld start untracked (see note above); add them via the edit modal.
    manualMonthly: { a3: 800, a5: 50000 },
  };

  window.HZ = {
    eur,
    eurUnit,
    categoryColorPalette: [
      "#7FA7D9",
      "#74C29B",
      "#C9897F",
      "#B79CE0",
      "#E0A86B",
      "#5FB8C0",
      "#C7AE57",
      "#909AAE",
      "#D08AB0",
      "#9FBF6F",
      "#6F9FBF",
      "#BF6F8F",
      "#6FBF9F",
      "#BFA36F",
      "#8FBF6F",
      "#6F8FBF",
      "#BF7F6F",
      "#9F6FBF",
      "#6FBFBF",
      "#BF8F6F",
    ],
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
    history,
    trackableAccountIds,
    computeSavingsGoal,
    savingsGoalConfig,
    projection: projection.pts,
    payoffIndex: projection.payoffIndex,
    payoff,
    yearSummaries,
    monthsToPayoff,
    TODAY_INDEX,
    today: { year: 2026, month: 6, label: "July 2026" },
  };
})();
