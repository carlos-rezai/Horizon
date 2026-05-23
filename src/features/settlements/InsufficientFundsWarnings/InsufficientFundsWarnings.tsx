import { useState } from "react";
import Snackbar from "../../../components/Snackbar/Snackbar";
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
        <Snackbar
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
