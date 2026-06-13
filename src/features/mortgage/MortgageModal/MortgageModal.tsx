import { useState } from "react";
import type { AccountWithBalance } from "../../../types/account";
import { API_BASE } from "../../../utils/api/api";
import { eurosToCents, centsToEuros } from "../../../utils/currency/currency";
import { percentPaidOff } from "../../../utils/mortgage/mortgage";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import DatePicker from "../../../primitives/DatePicker/DatePicker";
import Button from "../../../primitives/Button/Button";
import {
  StyledForm,
  StyledActions,
  StyledErrorText,
  StyledPreview,
} from "./MortgageModal.styles";

interface Props {
  account: AccountWithBalance;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MortgageModal({ account, onClose, onSuccess }: Props) {
  const [originalPrincipal, setOriginalPrincipal] = useState(
    account.originalPrincipal != null
      ? centsToEuros(account.originalPrincipal)
      : ""
  );
  const [startDate, setStartDate] = useState(account.startDate ?? "");
  const [termYears, setTermYears] = useState(
    account.termYears != null ? String(account.termYears) : ""
  );
  const [error, setError] = useState<string | null>(null);

  const principalCents = eurosToCents(originalPrincipal);
  const safePrincipalCents = Number.isNaN(principalCents) ? 0 : principalCents;
  const percent = percentPaidOff(safePrincipalCents, account.balance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (safePrincipalCents < account.balance) {
      setError("Original principal cannot be below the current Restschuld.");
      return;
    }

    const res = await fetch(`${API_BASE}/accounts/${account.id}/mortgage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalPrincipal: safePrincipalCents,
        startDate,
        termYears: Number(termYears),
      }),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to save mortgage details");
      return;
    }

    onSuccess();
  };

  return (
    <Modal onClose={onClose}>
      <StyledForm onSubmit={handleSubmit}>
        <h2>Mortgage details</h2>

        <FormField label="Original principal" htmlFor="original-principal">
          <Input
            id="original-principal"
            type="number"
            step="0.01"
            value={originalPrincipal}
            onChange={(e) => setOriginalPrincipal(e.target.value)}
          />
        </FormField>

        <FormField label="Start date" htmlFor="start-date">
          <DatePicker
            aria-label="start date"
            value={startDate}
            onChange={setStartDate}
          />
        </FormField>

        <FormField label="Term (years)" htmlFor="term-years">
          <Input
            id="term-years"
            type="number"
            value={termYears}
            onChange={(e) => setTermYears(e.target.value)}
          />
        </FormField>

        <StyledPreview>{Math.round(percent)}% paid off</StyledPreview>

        {error && <StyledErrorText role="alert">{error}</StyledErrorText>}

        <StyledActions>
          <Button type="submit">Save</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </StyledActions>
      </StyledForm>
    </Modal>
  );
}
