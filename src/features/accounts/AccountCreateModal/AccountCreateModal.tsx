import { useState } from "react";
import type { AccountKind } from "../../../types/account";
import { API_BASE } from "../../../utils/api";
import { eurosToCents } from "../../../utils/currency";

interface Props {
  onClose: () => void;
  onSuccess: (accountId: string) => void;
}

const ACCOUNT_KINDS: AccountKind[] = [
  "Girokonto",
  "Tagesgeld",
  "Mortgage",
  "CreditCard",
  "Investment",
];

export default function AccountCreateModal({ onClose, onSuccess }: Props) {
  const [kind, setKind] = useState<AccountKind>("Girokonto");
  const [name, setName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [openingDate, setOpeningDate] = useState("");
  const [sondertilgungAllowance, setSondertilgungAllowance] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !openingDate) return;

    const body: Record<string, unknown> = {
      kind,
      name: name.trim(),
      openingBalance: eurosToCents(openingBalance),
      openingDate,
    };

    if (kind === "Mortgage" && sondertilgungAllowance) {
      body.sondertilgungAllowance = eurosToCents(sondertilgungAllowance);
    }

    const res = await fetch(`${API_BASE}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as { _id?: string; error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to create account");
      return;
    }

    onSuccess(data._id!);
  };

  return (
    <div role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit}>
        <label>
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as AccountKind)}
          >
            {ACCOUNT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>

        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          Opening Balance
          <input
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
        </label>

        <label>
          Opening Date
          <input
            type="date"
            value={openingDate}
            onChange={(e) => setOpeningDate(e.target.value)}
          />
        </label>

        {kind === "Mortgage" && (
          <label>
            Sondertilgung Allowance
            <input
              type="number"
              step="0.01"
              value={sondertilgungAllowance}
              onChange={(e) => setSondertilgungAllowance(e.target.value)}
            />
          </label>
        )}

        {error && <p role="alert">{error}</p>}

        <button type="submit">Create account</button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}
