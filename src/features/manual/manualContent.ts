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
 * correct and the copy is rewritten. Getting Started carries its six step
 * headings now so the ordering is fixed; the step bodies arrive with that pass.
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
      { heading: "1. Create your accounts", body: "" },
      { heading: "2. Configure your mortgage", body: "" },
      { heading: "3. Add your recurring transactions", body: "" },
      { heading: "4. Set a savings goal", body: "" },
      { heading: "5. Import your history", body: "" },
      { heading: "6. Read the Trajectory chart", body: "" },
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
