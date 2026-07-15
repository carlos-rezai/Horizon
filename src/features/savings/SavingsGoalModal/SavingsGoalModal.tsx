import { useState } from "react";
import Modal from "../../../components/Modal/Modal";
import Input from "../../../primitives/Input/Input";
import Button from "../../../primitives/Button/Button";
import { centsToEuros, eurosToCents } from "../../../utils/currency/currency";
import type { SavingsGoalConfig, SavingsGoalMode } from "../savingsTypes";
import type { AccountWithBalance } from "../../../types/account";
import {
  StyledBody,
  StyledFieldLabel,
  StyledModeToggle,
  StyledModeChip,
  StyledHint,
  StyledAccountRows,
  StyledAccountRow,
  StyledColorDot,
  StyledAccountName,
} from "./SavingsGoalModal.styles";

interface Props {
  config: SavingsGoalConfig;
  accounts: AccountWithBalance[];
  onClose: () => void;
  onSave: (config: SavingsGoalConfig) => void;
}

/** Euros the input should show for an account, from its stored cents target. */
function initialEuros(config: SavingsGoalConfig, id: string): string {
  return centsToEuros(config.manualMonthly[id] ?? 0);
}

/**
 * The Savings Streak goal editor. Manual mode lists every trackable account as
 * a direct euro input, pre-filled from the saved config; values are entered in
 * euros and returned to `onSave` as integer cents. `startedAt` is server-owned
 * and passed straight back through, never surfaced here. The Milestone/Manual
 * toggle is present as the mode affordance; the Milestone auto-split editor and
 * convert-on-edit land in a later phase, so saves persist Manual targets.
 */
export default function SavingsGoalModal({
  config,
  accounts,
  onClose,
  onSave,
}: Props) {
  const [mode, setMode] = useState<SavingsGoalMode>(config.mode);
  const [euros, setEuros] = useState<Record<string, string>>(() =>
    Object.fromEntries(accounts.map((a) => [a.id, initialEuros(config, a.id)]))
  );

  const setAccountEuros = (id: string, value: string) =>
    setEuros((prev) => ({ ...prev, [id]: value }));

  const handleSave = () => {
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
            <StyledModeChip
              type="button"
              $active={mode === "milestone"}
              onClick={() => setMode("milestone")}
            >
              Milestone
            </StyledModeChip>
            <StyledModeChip
              type="button"
              $active={mode === "manual"}
              onClick={() => setMode("manual")}
            >
              Manual
            </StyledModeChip>
          </StyledModeToggle>
        </div>

        <StyledHint>
          Set the monthly savings target per account directly. Leave an account
          at €0 to exclude it from tracking.
        </StyledHint>

        <div>
          <StyledFieldLabel>Monthly target per account</StyledFieldLabel>
          <StyledAccountRows>
            {accounts.map((account) => (
              <StyledAccountRow key={account.id}>
                <StyledColorDot $color={account.color ?? "transparent"} />
                <StyledAccountName>{account.name}</StyledAccountName>
                <Input
                  prefix="€"
                  aria-label={`${account.name} monthly target`}
                  value={euros[account.id] ?? ""}
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
