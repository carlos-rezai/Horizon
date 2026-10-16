import { useState } from "react";
import type { AccountWithBalance } from "../../../types/account";
import { API_BASE } from "../../../utils/api/api";
import { eurosToCents } from "../../../utils/currency/currency";
import { percentPaidOff } from "../../../utils/mortgage/mortgage";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import DatePicker from "../../../primitives/DatePicker/DatePicker";
import Button from "../../../primitives/Button/Button";
import {
  StyledForm,
  StyledGroup,
  StyledGroupTitle,
  StyledNote,
  StyledPreview,
  StyledErrorText,
  StyledActions,
} from "./MortgageSetupModal.styles";

interface Props {
  onClose: () => void;
  onSuccess: (account: AccountWithBalance) => void;
}

interface MortgageSetupPayload {
  name: string;
  openingBalance: number;
  openingDate: string;
  originalPrincipal: number;
  startDate: string;
  termYears: number;
}

interface FormValues {
  name: string;
  restschuld: string;
  asOf: string;
  principal: string;
  startDate: string;
  term: string;
}

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Cents from a typed euro amount; NaN when the field is empty or not a number. */
function toCents(euros: string): number {
  return euros.trim() === "" ? NaN : eurosToCents(euros);
}

/** The field rules of the Mortgage and Origination groups: the first broken
 *  rule's message, or the payload to POST when every rule holds. */
function validate(
  values: FormValues
): { ok: true; payload: MortgageSetupPayload } | { ok: false; error: string } {
  const name = values.name.trim();
  if (name === "") return { ok: false, error: "Enter a name." };

  const restschuld = toCents(values.restschuld);
  if (Number.isNaN(restschuld) || restschuld <= 0) {
    return { ok: false, error: "Restschuld today must be above 0." };
  }
  if (values.asOf === "") return { ok: false, error: "Enter the as-of date." };

  const principal = toCents(values.principal);
  if (Number.isNaN(principal) || principal <= 0) {
    return { ok: false, error: "Enter the original principal." };
  }
  if (principal < restschuld) {
    return {
      ok: false,
      error: "Original principal cannot be below the Restschuld today.",
    };
  }
  if (values.startDate === "") {
    return { ok: false, error: "Enter the start date." };
  }
  if (values.startDate > values.asOf) {
    return { ok: false, error: "Start date cannot be after the as-of date." };
  }

  const term = values.term.trim();
  const termYears = Number(term);
  if (!/^\d+$/.test(term) || termYears < 1 || termYears > 40) {
    return {
      ok: false,
      error: "Term must be a whole number from 1 to 40 years.",
    };
  }

  return {
    ok: true,
    payload: {
      name,
      openingBalance: restschuld,
      openingDate: values.asOf,
      originalPrincipal: principal,
      startDate: values.startDate,
      termYears,
    },
  };
}

export default function MortgageSetupModal({ onClose, onSuccess }: Props) {
  const [values, setValues] = useState<FormValues>(() => ({
    name: "Mortgage",
    restschuld: "",
    asOf: todayIso(),
    principal: "",
    startDate: "",
    term: "",
  }));
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof FormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const restschuldCents = toCents(values.restschuld);
  const principalCents = toCents(values.principal);
  const percent =
    Number.isNaN(restschuldCents) || Number.isNaN(principalCents)
      ? 0
      : percentPaidOff(principalCents, restschuldCents);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = validate(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    const res = await fetch(`${API_BASE}/mortgages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.payload),
    });

    if (!res.ok) {
      const data = (await res.json()) as {
        issues?: { message: string }[];
        error?: string;
      };
      setError(
        data.issues?.[0]?.message ?? data.error ?? "Failed to set up mortgage"
      );
      return;
    }

    onSuccess((await res.json()) as AccountWithBalance);
  };

  return (
    <Modal onClose={onClose}>
      <StyledForm onSubmit={handleSubmit}>
        <h2>Set up mortgage</h2>

        <StyledGroup>
          <StyledGroupTitle>Mortgage</StyledGroupTitle>
          <FormField label="Name" htmlFor="mortgage-setup-name">
            <Input
              id="mortgage-setup-name"
              value={values.name}
              onChange={(e) => set("name")(e.target.value)}
            />
          </FormField>
          <FormField
            label="Restschuld today"
            htmlFor="mortgage-setup-restschuld"
          >
            <Input
              id="mortgage-setup-restschuld"
              type="number"
              step="0.01"
              value={values.restschuld}
              onChange={(e) => set("restschuld")(e.target.value)}
            />
          </FormField>
          <FormField label="As of">
            <DatePicker
              aria-label="as of"
              value={values.asOf}
              onChange={set("asOf")}
            />
          </FormField>
        </StyledGroup>

        <StyledGroup>
          <StyledGroupTitle>Origination</StyledGroupTitle>
          <FormField
            label="Original principal"
            htmlFor="mortgage-setup-principal"
          >
            <Input
              id="mortgage-setup-principal"
              type="number"
              step="0.01"
              value={values.principal}
              onChange={(e) => set("principal")(e.target.value)}
            />
          </FormField>
          <FormField label="Start date">
            <DatePicker
              aria-label="start date"
              value={values.startDate}
              onChange={set("startDate")}
            />
          </FormField>
          <FormField label="Term (years)" htmlFor="mortgage-setup-term">
            <Input
              id="mortgage-setup-term"
              type="number"
              value={values.term}
              onChange={(e) => set("term")(e.target.value)}
            />
          </FormField>
          <StyledPreview>{Math.round(percent)}% paid off</StyledPreview>
        </StyledGroup>

        <StyledGroup>
          <StyledGroupTitle>Repayment</StyledGroupTitle>
          <StyledNote>
            Add a Girokonto to set up the monthly repayment.
          </StyledNote>
        </StyledGroup>

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
