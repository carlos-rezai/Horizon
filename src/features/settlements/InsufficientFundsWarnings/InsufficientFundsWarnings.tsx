import { useState } from "react";
import StackedSnackbar from "../../../components/SnackbarProvider/StackedSnackbar";
import type { InsufficientFundsWarning } from "../useSettlementWarnings";

interface Props {
  warnings: InsufficientFundsWarning[];
}

export default function InsufficientFundsWarnings({ warnings }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = warnings.filter((w) => !dismissed.has(w.ccAccountId));

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((w) => (
        <StackedSnackbar
          key={w.ccAccountId}
          variant="error"
          message={`Insufficient funds: settlement of ${(w.settlementAmount / 100).toFixed(2)} due ${w.settlementMonth}`}
          onClose={() =>
            setDismissed((prev) => new Set([...prev, w.ccAccountId]))
          }
        />
      ))}
    </>
  );
}
