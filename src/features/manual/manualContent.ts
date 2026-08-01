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
 * correct and the copy is rewritten. Getting Started carries its full six steps
 * now — enough to prove both detail-row shapes, prose and term list; the
 * remaining nine topics fill in with those passes.
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
        body: "Open the Savings Streak card on the Dashboard and click the pencil to set a goal. Milestone mode — a total amount and a target date, split across your accounts for you — is the recommended starting point; switch to Manual only when you want to set each account's monthly target by hand.",
      },
      {
        heading: "5. Import your history",
        body: "Optional, but recommended. From Import, bring in past bank statement CSVs for each account. This backfills History with reconstructed actuals and lets Month Overview show real variable spending instead of starting from zero.",
      },
      {
        heading: "6. Read the Trajectory chart",
        body: "Back on the Dashboard, Trajectory Horizon plots Total Liquid, each account and Restschuld years out, based on everything set up above. Use it to sanity-check the setup: balances should trend the way you would expect, and the payoff marker should land on a believable date. Toggle series on and off to inspect one account's line at a time.",
      },
    ],
  },
  dashboard: {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    blurb:
      "Your financial horizon at a glance: the headline KPIs, the Trajectory Horizon chart, your accounts, the mortgage countdown and the plan summary.",
    details: [],
  },
  streak: {
    id: "streak",
    icon: Flame,
    title: "Savings Streak",
    blurb:
      "A motivational card under Trajectory Horizon that tracks whether you hit your monthly savings target, account by account, month by month.",
    details: [],
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
