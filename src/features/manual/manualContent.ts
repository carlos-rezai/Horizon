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
 * correct and the copy is rewritten. Getting Started, Dashboard, Savings
 * Streak, Outlook, Month Overview and History are written; the remaining four
 * topics fill in with the later copy passes.
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
    details: [
      {
        heading: "The summary strip",
        body: "The sidebar calls this screen Outlook; the page header calls it Financial Plan, with “Outlook” as the small overline above the title — one screen, two names. Three figures sit under the header, each summarising the whole 240-month projection rather than the year you happen to be reading.",
        terms: [
          {
            term: "Total Liquid",
            definition:
              "Your Girokonto and Tagesgeld balances at the very last month of the projection, with that month's year printed beside the label so you know how far out the figure is.",
          },
          {
            term: "Debt-free",
            definition:
              "The first month the Restschuld reaches zero. It reads “—” when there is no mortgage debt at the start of the projection, and also when the debt is still outstanding twenty years out — in that case the plan simply never pays it off.",
          },
          {
            term: "Total Sondertilgung",
            definition:
              "Every extra mortgage repayment the plan expects of you across all twenty years, added up and shown as money leaving you, with the number of months one falls in noted underneath. Horizon reads these off the projection itself: each month the Restschuld steps down is one Sondertilgung.",
          },
        ],
      },
      {
        heading: "The Projection Accordion",
        body: "One row per year for twenty years, under the columns Period, Total Liquid, Restschuld, Net Cashflow and Sondertilgung. A year's Total Liquid and Restschuld are its closing figures — the last month of that year — while Net Cashflow and Sondertilgung are summed across its months. The current year is open when you arrive, and it covers only the months from now to December, so its cashflow is a part-year total. The payoff year is highlighted and its Restschuld turns into a flag; expand any year for its twelve months, where the payoff month is flagged again and every month a Sondertilgung falls in is tinted. Without a Mortgage account the Restschuld and Sondertilgung columns read “—” throughout.",
      },
      {
        heading: "Jumping to a month",
        body: "Click any month row to open Month Overview for that month — the variable spending behind the figure you were just reading. Going back returns you to Outlook with the year you left from still expanded. The Dashboard's Plan Summary does the same thing in reverse: clicking one of its years opens Outlook scrolled to that year, already expanded.",
      },
      {
        heading: "Recalculate",
        body: "Re-runs the projection on the server from your current accounts, balances and recurring transactions, replaces both sections with the result, and confirms with “Recalculated”. Outlook already refetches every time you open it, so this is not something you have to remember — it is here for when you want to force a fresh run without leaving the screen.",
      },
      {
        heading: "Why the projection can look flat",
        body: "Nothing but recurring transactions drives Outlook — no variable spending is extrapolated and no growth is assumed. With accounts but no recurring transactions the accordion still fills with twenty years of rows; they are simply flat, the same Total Liquid repeated with a Net Cashflow of zero. That is the engine reporting that it has no input, not a failure. Add salary, rent, transfers and Sondertilgung from each account's detail page and the rows start to move. There is only one case where the accordion is genuinely empty — no accounts at all — and it says so.",
      },
    ],
  },
  month: {
    id: "month",
    icon: Calendar,
    title: "Month Overview",
    blurb:
      "Variable (non-recurring) spending for a single month, with a category breakdown and account filters.",
    details: [
      {
        heading: "Month navigation",
        body: "The arrows either side of the month label step one month back or forward and are not bounded — you can walk into next year if you want to. The label itself opens a month-and-year picker, and that grid is bounded: it runs from the earliest month you have imported a statement for up to the month currently on screen. A greyed-out cell means nothing was imported that far back, not a dead control, and with no imports at all the picker collapses to the single month you are on. Note that it never reaches past the month you are viewing — stepping forward is the arrows' job. The sidebar's Month entry always returns you to the current calendar month.",
      },
      {
        heading: "The spending list",
        body: "The card labelled “Variable Spending” lists every one-off transaction in the month, oldest first, each with its day, description, account and category badge. The tabs above it filter by account: “All accounts” first with the month's total count, then one tab per account in your own account order, each with its colour and its own count. Only accounts that can hold day-to-day spending are tabbed — Girokonto, Tagesgeld and CreditCard — since a mortgage or an investment account never carries a one-off purchase. Transfers between your own accounts and credit-card settlements are left out of the list entirely: they move money rather than spend it. Click any row to change its description, amount, date, direction or category, or to delete it; the change is on screen immediately and is put back with a message if the server refuses it.",
      },
      {
        heading: "Add expense",
        body: "Logs a one-off purchase without importing anything: date, amount, description and category. The date is confined to the month you are viewing. The expense lands on the account whose tab is open, so pick that account's tab before adding — with “All accounts” selected it goes to the first account in your list. Setting a “To account” records a transfer between two of your own accounts instead of an expense, and a transfer is not spending: it will not appear in this list or in the breakdown.",
      },
      {
        heading: "The breakdown donut",
        body: "The “Breakdown / By category” ring groups the month's variable spending by category, largest slice first, each drawn in the colour that category carries in Categories. The centre shows the month's total rounded to whole euros; the legend beneath it keeps the cents. It always covers every account — the tabs filter the list, not the donut — and it leaves out the same transfers and settlements the list does. A month with nothing to show says so rather than drawing an empty ring.",
      },
      {
        heading: "Year comparison",
        body: "The “This year so far” card adds up your variable spending per category from Jan 1 through the month you are viewing, and sets it against the identical span of the year before — Jan 1 to the same month last year, so you are never reading twelve months against three. The five categories you have spent most on this year get a row each: two bars on one shared scale, this year in the category's colour and last year muted beneath it. Like the donut it reads every spending account whichever tab is open, and it counts the same transactions the list shows. It is built from what you have actually recorded, so a year you have imported and entered nothing for reads “No spending yet this year.”",
      },
    ],
  },
  history: {
    id: "history",
    icon: Clock,
    title: "History",
    blurb:
      "Reconstructed actuals — the real trajectory of your accounts over time, built from imported bank statements only.",
    details: [
      {
        heading: "The range chips",
        body: "Above the chart titled “Historical Trajectory” sit three chips — 1 Year, 3 Years and All history — setting how far back it draws. They trim from the old end only: the most recent reconstructed month always stays at the right edge, under the dotted TODAY marker. They change the chart alone, and the Year Archive underneath keeps listing every year regardless.",
      },
      {
        heading: "The chart series",
        body: "The chips under the chart behave exactly like the Dashboard's: click one to show or hide that series, double-click it to isolate it, and “Show all” appears as soon as anything is hidden. Total Liquid starts hidden, and a Mortgage account has no line of its own — it is the dashed Restschuld series. What you show and hide here is remembered separately from the Dashboard, so the two charts can be set up differently. Hovering a month gives every visible series' balance plus what that month's Net Cashflow actually was. Every figure is reconstructed from your imported statements rather than projected, which is why History and Outlook can disagree about the same month and both be right.",
      },
      {
        heading: "The Year Archive",
        body: "Only years holding at least one imported statement are listed — a year missing here means nothing has been imported for it, not that Horizon lost it. Each year gives its closing Total Liquid and Restschuld, taken from the last month available so a part-year is safe to read, the year's summed Net Cashflow, and a badge counting its statements that takes you to Import. The newest year sits on top and opens by default; expand it for its months, and click a month to open Month Overview for it. Until the first statement is imported there is no archive and no chart — the screen is a single invitation to go to Import.",
      },
    ],
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
