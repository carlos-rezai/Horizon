import { useMemo, useState } from "react";
import Modal from "../../../components/Modal/Modal";
import Input from "../../../primitives/Input/Input";
import DatePicker from "../../../primitives/DatePicker/DatePicker";
import Button from "../../../primitives/Button/Button";
import ChoiceChip from "../../../primitives/ChoiceChip/ChoiceChip";
import { centsToEuros, eurosToCents } from "../../../utils/currency/currency";
import { milestoneSplit } from "../../../utils/savingsGoal/savingsGoal";
import type { SavingsGoalConfig, SavingsGoalMode } from "../savingsTypes";
import type { AccountWithBalance } from "../../../types/account";
import type { HistoryPoint } from "../../history/historyTypes";
import {
  StyledBody,
  StyledFieldLabel,
  StyledModeToggle,
  StyledHint,
  StyledMilestoneFields,
  StyledAccountRows,
  StyledAccountRow,
  StyledColorDot,
  StyledAccountName,
} from "./SavingsGoalModal.styles";

interface Props {
  config: SavingsGoalConfig;
  accounts: AccountWithBalance[];
  /** Reconstructed monthly history — the source for the Milestone auto-split. */
  points?: HistoryPoint[];
  onClose: () => void;
  onSave: (config: SavingsGoalConfig) => void;
}

/**
 * The Savings Streak goal editor. Two modes share one per-account row list:
 *
 * - **Manual** — each row is a direct euro input, pre-filled from the saved
 *   config. Values are entered in euros and returned to `onSave` as integer
 *   cents.
 * - **Milestone** — one total target amount + one target month drive a live,
 *   read-only per-account split derived by `milestoneSplit` (weighted by each
 *   account's recent savings pace, floored so no account is dropped). Editing
 *   any row silently converts the goal to Manual, pre-filled with the current
 *   derived split — overriding one account never discards the rest.
 *
 * Switching modes is non-destructive: the manual values persist while you flip
 * to Milestone and back. Manual is seeded from the live auto-split only while it
 * is still pristine (a goal that opened in Milestone); once you have typed a
 * value, your numbers survive every toggle untouched.
 *
 * `startedAt` is server-owned and passed straight back through, never surfaced.
 */
export default function SavingsGoalModal({
  config,
  accounts,
  points = [],
  onClose,
  onSave,
}: Props) {
  const [mode, setMode] = useState<SavingsGoalMode>(config.mode);
  const [targetTotal, setTargetTotal] = useState<string>(
    centsToEuros(config.targetTotal)
  );
  const [targetMonth, setTargetMonth] = useState<string>(config.targetDate);
  const [euros, setEuros] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      accounts.map((a) => [a.id, centsToEuros(config.manualMonthly[a.id] ?? 0)])
    )
  );
  // Whether the manual values represent real user intent yet. A goal that opened
  // in Manual already carries saved values; one that opened in Milestone starts
  // pristine, so its first entry into Manual adopts the live auto-split. Once
  // true, the manual values are never re-seeded from the split behind the user.
  const [manualDirty, setManualDirty] = useState(config.mode === "manual");

  const trackableIds = useMemo(() => accounts.map((a) => a.id), [accounts]);

  // The live Milestone split: re-derived whenever the total or month changes.
  const derived = useMemo<Record<string, number>>(() => {
    const cents = eurosToCents(targetTotal);
    if (!cents || Number.isNaN(cents) || points.length === 0) return {};
    return milestoneSplit(cents, targetMonth, points, trackableIds);
  }, [targetTotal, targetMonth, points, trackableIds]);

  /** Euros shown in a row: the derived split in Milestone, the input otherwise. */
  const displayValue = (id: string): string =>
    mode === "milestone" ? centsToEuros(derived[id] ?? 0) : (euros[id] ?? "");

  /** The current derived split as euro strings — the manual seed baseline. */
  const derivedEuros = (): Record<string, string> =>
    Object.fromEntries(
      accounts.map((a) => [a.id, centsToEuros(derived[a.id] ?? 0)])
    );

  /** Enter Manual mode. Seed from the live auto-split only while the manual
   *  values are still pristine; after any edit, they persist untouched. */
  const goManual = () => {
    if (!manualDirty) setEuros(derivedEuros());
    setMode("manual");
  };

  const setAccountEuros = (id: string, value: string) => {
    // Editing a row while viewing the Milestone split is an explicit override:
    // adopt the split as the manual baseline, then apply this edit on top of it
    // so the other accounts are kept, and stay in Manual from here on.
    if (mode === "milestone") {
      setEuros({ ...derivedEuros(), [id]: value });
      setMode("manual");
    } else {
      setEuros((prev) => ({ ...prev, [id]: value }));
    }
    setManualDirty(true);
  };

  const handleSave = () => {
    if (mode === "milestone") {
      onSave({
        ...config,
        mode: "milestone",
        targetTotal: eurosToCents(targetTotal) || 0,
        // The day picker yields a full `YYYY-MM-DD`; the goal is month-scoped,
        // so persist just the month.
        targetDate: targetMonth.slice(0, 7),
        manualMonthly: {},
      });
      return;
    }
    const manualMonthly = Object.fromEntries(
      accounts.map((a) => {
        const cents = eurosToCents(euros[a.id] ?? "0");
        return [a.id, Number.isNaN(cents) ? 0 : cents];
      })
    );
    onSave({ ...config, mode: "manual", manualMonthly });
  };

  return (
    <Modal
      onClose={onClose}
      title="Edit savings goal"
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" icon="Check" onClick={handleSave}>
            Save changes
          </Button>
        </>
      }
    >
      <StyledBody>
        <div>
          <StyledFieldLabel>Mode</StyledFieldLabel>
          <StyledModeToggle>
            <ChoiceChip
              label="Milestone"
              active={mode === "milestone"}
              onClick={() => setMode("milestone")}
            />
            <ChoiceChip
              label="Manual"
              active={mode === "manual"}
              onClick={goManual}
            />
          </StyledModeToggle>
        </div>

        {mode === "milestone" ? (
          <>
            <StyledHint>
              Set a total amount and a target month — Horizon splits the monthly
              savings across your tracked accounts automatically, weighted by
              each account&apos;s recent savings pace.
            </StyledHint>
            <StyledMilestoneFields>
              <div>
                <StyledFieldLabel>Target amount</StyledFieldLabel>
                <Input
                  prefix="€"
                  aria-label="Target amount"
                  value={targetTotal}
                  onChange={(e) => setTargetTotal(e.target.value)}
                />
              </div>
              <div>
                <StyledFieldLabel>Target month</StyledFieldLabel>
                <DatePicker
                  aria-label="Target month"
                  value={targetMonth}
                  onChange={setTargetMonth}
                />
              </div>
            </StyledMilestoneFields>
          </>
        ) : (
          <StyledHint>
            Set the monthly savings target per account directly. Leave an
            account at €0 to exclude it from tracking.
          </StyledHint>
        )}

        <div>
          <StyledFieldLabel>
            {mode === "milestone"
              ? "Auto-split by account — edit a value to switch to Manual"
              : "Monthly target per account"}
          </StyledFieldLabel>
          <StyledAccountRows>
            {accounts.map((account) => (
              <StyledAccountRow key={account.id}>
                <StyledColorDot $color={account.color ?? "transparent"} />
                <StyledAccountName>{account.name}</StyledAccountName>
                <Input
                  prefix="€"
                  aria-label={`${account.name} monthly target`}
                  value={displayValue(account.id)}
                  onChange={(e) => setAccountEuros(account.id, e.target.value)}
                />
              </StyledAccountRow>
            ))}
          </StyledAccountRows>
        </div>
      </StyledBody>
    </Modal>
  );
}
