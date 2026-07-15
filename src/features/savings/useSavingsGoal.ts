import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../utils/api/api";
import type { AccountKind } from "../../types/account";
import { useAccounts } from "../accounts/useAccounts";
import { useHistory } from "../history/useHistory";
import { computeSavingsGoal } from "./computeSavingsGoal";
import type { SavingsGoal, SavingsGoalConfig } from "./savingsTypes";

interface UseSavingsGoalResult {
  goal: SavingsGoal;
  isLoading: boolean;
  /** PUT the config, then re-derive the goal from the persisted result. */
  save: (config: SavingsGoalConfig) => Promise<void>;
}

// Only liquid + investment accounts fit a "save X per month" target;
// Mortgage/CreditCard are excluded from the streak entirely. Order follows the
// account list (persisted `sortOrder`).
const TRACKABLE_KINDS: readonly AccountKind[] = [
  "Girokonto",
  "Tagesgeld",
  "Investment",
];

/** The config the hook computes against before the goal fetch resolves. */
const DEFAULT_CONFIG: SavingsGoalConfig = {
  mode: "manual",
  targetTotal: 0,
  targetDate: "1970-01",
  startedAt: "1970-01",
  manualMonthly: {},
};

/** Narrow an unknown fetch payload to a usable config. */
function isSavingsGoalConfig(value: unknown): value is SavingsGoalConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SavingsGoalConfig).mode === "string" &&
    typeof (value as SavingsGoalConfig).targetDate === "string" &&
    typeof (value as SavingsGoalConfig).startedAt === "string"
  );
}

/**
 * Read-only in Phase 1: loads the saved goal config, pairs it with the
 * reconstructed history points and the trackable account ids, and runs
 * `computeSavingsGoal`. The save path arrives in Phase 3.
 */
export function useSavingsGoal(): UseSavingsGoalResult {
  const { points, isLoading: historyLoading } = useHistory();
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const [config, setConfig] = useState<SavingsGoalConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/savings-goal`)
      .then((res) => res.json() as Promise<unknown>)
      .then((data) => {
        if (!cancelled) {
          setConfig(isSavingsGoalConfig(data) ? data : null);
          setConfigLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfig(null);
          setConfigLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const trackableIds = useMemo(
    () =>
      accounts
        .filter((account) => TRACKABLE_KINDS.includes(account.kind))
        .map((account) => account.id),
    [accounts]
  );

  const goal = useMemo(
    () => computeSavingsGoal(config ?? DEFAULT_CONFIG, points, trackableIds),
    [config, points, trackableIds]
  );

  const save = useCallback(async (next: SavingsGoalConfig) => {
    const res = await fetch(`${API_BASE}/savings-goal`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    // The route stamps/fixes `startedAt`, so the persisted config is the
    // authority — re-derive from it rather than the optimistic input.
    const saved = (await res.json()) as unknown;
    if (isSavingsGoalConfig(saved)) setConfig(saved);
  }, []);

  const isLoading = historyLoading || accountsLoading || configLoading;

  return { goal, isLoading, save };
}
