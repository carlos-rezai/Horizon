// Seeds the throwaway audit DB through the REST API with anonymised data.
const API = "http://127.0.0.1:3001";

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const today = "2026-10-18";

const giro = await call("POST", "/accounts", {
  kind: "Girokonto",
  name: "Main Giro",
  anchorBalance: 324560,
  anchorDate: today,
  color: "#7FA7D9",
});
const tages = await call("POST", "/accounts", {
  kind: "Tagesgeld",
  name: "Rainy Day Fund",
  anchorBalance: 1250000,
  anchorDate: today,
  color: "#8FBF6F",
});
const invest = await call("POST", "/accounts", {
  kind: "Investment",
  name: "Index Portfolio",
  anchorBalance: 2875000,
  anchorDate: today,
  color: "#B48FD9",
});
const cc = await call("POST", "/accounts", {
  kind: "CreditCard",
  name: "Everyday Card",
  anchorBalance: -42310,
  anchorDate: today,
  color: "#E0A86B",
  linkedAccountId: giro.id,
  settlementDay: 5,
});
const mortgage = await call("POST", "/mortgages", {
  name: "Home Loan",
  anchorBalance: 18650000,
  anchorDate: today,
  originalPrincipal: 26000000,
  startDate: "2023-03-01",
  termYears: 10,
  color: "#C9897F",
  repayment: {
    paidFromAccountId: giro.id,
    monthlyAmount: 120000,
    dayOfMonth: 1,
    sondertilgungAmount: 500000,
    sondertilgungMonth: 11,
  },
});

// Recurring rules
const rec = (b) => call("POST", "/recurring-transactions", b);
await rec({
  accountId: giro.id,
  amount: 420000,
  description: "Salary",
  category: "Income",
  frequency: "monthly",
  dayOfMonth: 27,
});
await rec({
  accountId: giro.id,
  amount: -1299,
  description: "Streaming",
  category: "Subscriptions",
  frequency: "monthly",
  dayOfMonth: 3,
});
await rec({
  accountId: giro.id,
  amount: -8900,
  description: "Phone & Internet",
  category: "Subscriptions",
  frequency: "monthly",
  dayOfMonth: 15,
});
await rec({
  accountId: giro.id,
  amount: 50000,
  description: "Savings transfer",
  category: "Transfer",
  frequency: "monthly",
  dayOfMonth: 28,
  linkedAccountId: tages.id,
});
await rec({
  accountId: giro.id,
  amount: 30000,
  description: "ETF savings plan",
  category: "Investment",
  frequency: "monthly",
  dayOfMonth: 2,
  linkedAccountId: invest.id,
});
await rec({
  accountId: giro.id,
  amount: -24000,
  description: "Home insurance",
  category: "Housing",
  frequency: "annual",
  dayOfMonth: 10,
  monthOfYear: 3,
});

// Categories beyond the defaults
await call("POST", "/categories", { name: "Groceries" });
await call("POST", "/categories", { name: "Transport" });

// Variable spending across several months
const spend = [
  ["Groceries", "Corner Market", 4280],
  ["Food", "Noodle Bar", 2350],
  ["Transport", "City Transit", 4900],
  ["Entertainment", "Cinema", 2400],
  ["Groceries", "Fresh Foods", 6715],
  ["Miscellaneous", "Hardware Store", 3199],
  ["Food", "Bakery", 860],
  ["Groceries", "Corner Market", 5120],
];
const months = [
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
];
for (const m of months) {
  for (let i = 0; i < spend.length; i++) {
    const [category, description, cents] = spend[i];
    const day = String(2 + i * 2).padStart(2, "0");
    if (m === "2026-10" && Number(day) > 17) continue;
    const acct = i % 3 === 0 ? cc.id : giro.id;
    await call("POST", `/accounts/${acct}/transactions`, {
      date: `${m}-${day}`,
      amount: -cents,
      description,
      category,
    });
  }
}
// Last year for the Year Comparison
for (const m of ["2025-03", "2025-06", "2025-09"]) {
  await call("POST", `/accounts/${giro.id}/transactions`, {
    date: `${m}-12`,
    amount: -5400,
    description: "Corner Market",
    category: "Groceries",
  });
  await call("POST", `/accounts/${giro.id}/transactions`, {
    date: `${m}-14`,
    amount: -2100,
    description: "Noodle Bar",
    category: "Food",
  });
}

// One committed import for Import History
await call("POST", "/imports", {
  accountId: giro.id,
  bank: "Postbank",
  filename: "statement-2026-04.csv",
  sizeBytes: 2048,
  mapping: {
    date: "Buchungstag",
    description: "Verwendungszweck",
    amount: "Betrag",
  },
  rows: [
    {
      date: "2026-04-03",
      amount: -3450,
      description: "Corner Market",
      category: "Groceries",
      counterparty: "Corner Market",
      categorySource: "chosen",
    },
    {
      date: "2026-04-09",
      amount: -1890,
      description: "Noodle Bar",
      category: "Food",
      counterparty: "Noodle Bar",
      categorySource: "chosen",
    },
    {
      date: "2026-04-21",
      amount: -4900,
      description: "City Transit",
      category: "Transport",
      counterparty: "City Transit",
      categorySource: "chosen",
    },
  ],
});

// Savings goal so the Savings Streak card has rows
await call("PUT", "/savings-goal", {
  mode: "manual",
  targetTotal: 0,
  targetDate: "2026-10",
  manualMonthly: { [tages.id]: 50000, [invest.id]: 30000, [giro.id]: 20000 },
});

console.log(
  JSON.stringify(
    {
      giro: giro.id,
      tages: tages.id,
      invest: invest.id,
      cc: cc.id,
      mortgage: mortgage?.id ?? mortgage,
    },
    null,
    2
  )
);
