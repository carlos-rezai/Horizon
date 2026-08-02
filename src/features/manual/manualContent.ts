import {
  Flag,
  LayoutDashboard,
  Flame,
  TrendingUp,
  Calendar,
  Clock,
  Upload,
  Landmark,
  Tags,
  Settings,
} from "lucide-react";
import type { ManualGroup, ManualTopicRecord } from "./manualTypes";

/**
 * Every claim the manual makes lives here, as typed data rather than prose
 * embedded in a component. Components render this module; they never author it.
 *
 * The detail-row bodies are written and verified line by line against shipped
 * code in the copy slices — where this module and the app disagree, the app is
 * correct and the copy is rewritten. Getting Started, Dashboard and Savings
 * Streak are written; the remaining seven topics fill in with the later copy
 * passes.
 */

/** Fixed order. The rail renders these groups top to bottom. */
export const MANUAL_GROUPS: ManualGroup[] = [
  { label: "Getting Started", topicIds: ["start"] },
  { label: "Overview", topicIds: ["dashboard", "streak"] },
  { label: "Planning", topicIds: ["outlook", "month", "history"] },
  { label: "Data", topicIds: ["import", "accounts", "categories"] },
  { label: "System", topicIds: ["settings"] },
];

export const MANUAL_TOPICS: ManualTopicRecord = {
  start: {
    id: "start",
    icon: Flag,
    title: "Getting Started",
    blurb:
      "A suggested order for setting up Horizon the first time, from a blank database to a working projection.",
    details: [
      {
        heading: "1. Create your accounts",
        body: "Start with every account whose balance you want Horizon to track. Each account needs a kind, a name, an opening balance and an opening date — the date that balance was true. Icon, colour and the trajectory-visibility toggle are optional polish you can add later.",
        terms: [
          {
            term: "Girokonto",
            definition:
              "Everyday checking account — where salary lands and bills go out. Most people have exactly one.",
          },
          {
            term: "Tagesgeld",
            definition:
              "Instant-access savings, kept separate from day-to-day spending so it is not accidentally spent.",
          },
          {
            term: "Mortgage",
            definition:
              "Tracks Restschuld — the remaining loan balance. Its opening balance is the Restschuld on your opening date, not the original loan amount; that is captured separately in step 2.",
          },
          {
            term: "CreditCard",
            definition:
              "Needs a funding account and a settlement day, since its balance is settled from another account each month rather than projected on its own.",
          },
          {
            term: "Investment",
            definition:
              "ETF or brokerage holdings. Usually left out of the Savings Streak, since it grows from market performance rather than a fixed monthly deposit.",
          },
        ],
      },
      {
        heading: "2. Configure your mortgage",
        body: "If you added a Mortgage account, open the pencil on the Dashboard's Mortgage Countdown card and fill in the original loan amount, the mortgage start date and the term in years. This is what “% paid off” is measured against, so payments you made before you started using Horizon are still reflected correctly.",
      },
      {
        heading: "3. Add your recurring transactions",
        body: "Outlook and the Trajectory Horizon chart are driven only by recurring transactions — nothing is projected from guesswork. From each account's detail page, add salary, rent, savings transfers, ETF contributions and Sondertilgung payments, each with an amount, a frequency and a day. Link a transfer to another account to model money moving between two of your own accounts, or link a Sondertilgung to your Mortgage account to model it paying down Restschuld.",
      },
      {
        heading: "4. Set a savings goal",
        body: "Open the Savings Streak card on the Dashboard and click the pencil to set a goal. Only Girokonto, Tagesgeld and Investment accounts can carry a target — a mortgage or a credit card is never tracked. Milestone mode takes a total amount and a target month and splits the monthly saving across those accounts for you, but it weights the split by each account's recent savings pace, which it reads from imported history. On a database with nothing imported there is no pace to weigh, so the split comes out at zero: either use Manual and type each account's monthly target by hand, or do step 5 first and come back.",
      },
      {
        heading: "5. Import your history",
        body: "Optional, but recommended. From Import, bring in past bank statement CSVs for each account. This backfills History with reconstructed actuals and lets Month Overview show real variable spending instead of starting from zero.",
      },
      {
        heading: "6. Read the Trajectory chart",
        body: "Back on the Dashboard, Trajectory Horizon plots each account and Restschuld ten years out, based on everything set up above. Use it to sanity-check the setup: balances should trend the way you would expect, and the payoff marker should land on a believable date. Total Liquid — the gold SUM line — starts hidden; click its chip in the legend to draw it. Click any chip to show or hide that series, and double-click one to inspect a single account on its own.",
      },
    ],
  },
  dashboard: {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    blurb:
      "Your financial horizon at a glance: the headline KPIs, the Trajectory Horizon chart, your accounts, the mortgage countdown and the plan summary.",
    details: [
      {
        heading: "The KPI strip",
        body: "Four tiles across the top, each reading the current month of the projection. A tile's sparkline covers the next twelve months, this month included, and the percentage beside its label is the change measured across that same window — it describes where the projection is heading, not what happened last month. All four tiles are always on screen: with no Mortgage account the Restschuld tile reads €0 and To Payoff reads “No payoff in horizon”.",
        terms: [
          {
            term: "Total Liquid",
            definition:
              "Your Girokonto and Tagesgeld balances added together. Investment and credit-card balances are deliberately left out — this is the money actually available to you.",
          },
          {
            term: "Restschuld",
            definition:
              "The remaining balance across your Mortgage accounts. Its sparkline should slope down; the percentage is negative while you are paying it off.",
          },
          {
            term: "Net Cashflow",
            definition:
              "Recurring money in minus recurring money out for the current month. Transfers between your own accounts are excluded, since they move money rather than earn or spend it, and this tile shows no percentage — a forward delta on a flow figure would be noise.",
          },
          {
            term: "To Payoff",
            definition:
              "Years and months until the Restschuld first reaches zero anywhere in the 20-year projection, with the debt-free month spelled out underneath.",
          },
        ],
      },
      {
        heading: "Trajectory Horizon",
        body: "A ten-year projection of every account, with the dashed Restschuld line falling toward zero and a payoff marker at the month it gets there — after which the area behind Total Liquid is tinted, because that is when the money is yours. A dotted TODAY line separates reconstructed past from projection. The chips under the chart are the legend and the controls: click one to show or hide that series, double-click one to isolate it, and use “Show all” to restore everything. Total Liquid starts hidden, and an account starts hidden if you turned off “Display in Trajectory Horizon” when you created it. A Mortgage account has no line of its own — it is the Restschuld series. Your choices are remembered between sessions, and the counter in the card header tells you how many of the series are currently drawn.",
      },
      {
        heading: "The Accounts card",
        body: "Every account you have, each with its icon, its colour, its current balance and its kind. Mortgage and credit-card balances are styled as what they are — money owed. Click a row to open that account's detail page, where its recurring transactions live; “Account” in the card header opens the same create dialog as “Add account” in the page header.",
      },
      {
        heading: "Mortgage Countdown",
        body: "This card is not on the Dashboard until you add a Mortgage account — its absence on a fresh install is by design, not a fault. Once it appears it leads with the remaining Restschuld, then how far through the loan you are: “% paid off” measured against the original principal, the month the mortgage started, and which year of the term you are in. Beneath that is the time left until payoff and the month it lands in, or a plain note when the projection never reaches zero. The pencil opens the origination editor — original principal, start date and term in years. Those three fields are what the percentage and the term line are measured against, which is why the account's opening balance is the Restschuld you had left rather than the amount you originally borrowed; the editor will not accept an original principal below the current Restschuld.",
      },
      {
        heading: "Plan Summary",
        body: "The first ten years of the Outlook projection, one row per year: total liquid at the end of the year, the Restschuld still outstanding, and any Sondertilgung the plan expects you to pay that year. The Restschuld column only appears when you have a Mortgage account, and the payoff year is flagged and highlighted. Click any year to open Outlook with that year expanded, or “Full plan” for the whole projection.",
      },
    ],
  },
  streak: {
    id: "streak",
    icon: Flame,
    title: "Savings Streak",
    blurb:
      "A motivational card under Trajectory Horizon that tracks whether you hit your monthly savings target, account by account, month by month.",
    details: [
      {
        heading: "Which accounts are tracked",
        body: "Only accounts that can sensibly carry a “save this much per month” target: Girokonto, Tagesgeld and Investment. Mortgage and CreditCard accounts are excluded from the streak entirely — paying down a debt is not the same promise as putting money aside, and mixing the two would make the streak meaningless. Expand the card and every trackable account gets a row. An account with no target still shows, dimmed, badged “Not tracked”, so you can see what you have chosen to leave out rather than wondering where it went.",
      },
      {
        heading: "Setting a goal",
        body: "The pencil in the card header opens the editor, which offers the same list of accounts two ways. Switching between the modes is safe: numbers you typed survive the round trip.",
        terms: [
          {
            term: "Milestone",
            definition:
              "You give one total amount and one target month; Horizon works out the monthly saving needed and splits it across your tracked accounts, weighted by each account's recent savings pace so the account you actually save into carries more of it. The split is read-only — but typing over any row switches the goal to Manual, pre-filled with the split, so overriding one account never throws away the rest. Because the weighting comes from imported history, a database with nothing imported has no pace to weigh and the split comes out at zero.",
          },
          {
            term: "Manual",
            definition:
              "You set each account's monthly target yourself. Leaving an account at €0 excludes it from tracking — that is what produces a “Not tracked” row.",
          },
        ],
      },
      {
        heading: "The calendar strip",
        body: "Twelve tiles, January to December, for the most recent year you have history for. A tile is met, missed, or upcoming — upcoming covers both months still to come and months too early to judge, since scoring a month needs the month before it to compare against. Hover a tile for the month and its verdict. The strip does not appear at all until there is history to build it from, so a fresh install shows the header alone.",
      },
      {
        heading: "How the streak is counted",
        body: "A month counts only if every tracked account met its own target that month — one account falling short breaks the month for all of them, which is what makes the streak worth keeping. A month with no tracked accounts never counts. The big number is your current streak: consecutive met months counting back from the most recent. Beside it is your best run anywhere in your history, and when the current streak equals it the card says so instead.",
      },
      {
        heading: "Where the numbers come from",
        body: "The streak is measured against real balances, not the projection: it reads the same reconstructed monthly History that the History screen draws, so a month is scored on what your balances actually did. Nothing here is forecast, and no streak exists until you have imported statements to score. The progress bars in the expanded rows work differently from the strip — they are cumulative since the month you first set a goal, comparing what an account has actually gained against its monthly target multiplied by the months since. The strip and the streak count look at all of your history; the bars only look at the goal's lifetime.",
      },
    ],
  },
  outlook: {
    id: "outlook",
    icon: TrendingUp,
    title: "Outlook",
    blurb:
      "The full 240-month projection, driven only by your recurring transactions — no variable spending is guessed at.",
    details: [],
  },
  month: {
    id: "month",
    icon: Calendar,
    title: "Month Overview",
    blurb:
      "Variable (non-recurring) spending for a single month, with a category breakdown and account filters.",
    details: [],
  },
  history: {
    id: "history",
    icon: Clock,
    title: "History",
    blurb:
      "Reconstructed actuals — the real trajectory of your accounts over time, built from imported bank statements only.",
    details: [],
  },
  import: {
    id: "import",
    icon: Upload,
    title: "Import",
    blurb:
      "Bring bank statement CSVs into Horizon. Everything is parsed and stored locally — nothing leaves this device.",
    details: [],
  },
  accounts: {
    id: "accounts",
    icon: Landmark,
    title: "Accounts",
    blurb:
      "Each account — Girokonto, Tagesgeld, Mortgage, CreditCard or Investment — has its own detail page with balance history and recurring transactions.",
    details: [],
  },
  categories: {
    id: "categories",
    icon: Tags,
    title: "Categories",
    blurb:
      "Manage the categories used to tag spending, from Settings → Preferences → Categories.",
    details: [],
  },
  settings: {
    id: "settings",
    icon: Settings,
    title: "Settings",
    blurb:
      "Storage, preferences and app info. Horizon is offline-first: no cloud, no telemetry, no account.",
    details: [],
  },
};
