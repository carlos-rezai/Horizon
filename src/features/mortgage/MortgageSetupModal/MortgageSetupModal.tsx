import { useState } from "react";
import type { AccountWithBalance } from "../../../types/account";
import { API_BASE } from "../../../utils/api/api";
import { apiErrorMessage } from "../../../utils/apiError/apiError";
import { eurosToCents } from "../../../utils/currency/currency";
import { percentPaidOff } from "../../../utils/mortgage/mortgage";
import { MONTHS_LONG } from "../../../utils/format/format";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import DatePicker from "../../../primitives/DatePicker/DatePicker";
import Select from "../../../primitives/Select/Select";
import Stepper from "../../../primitives/Stepper/Stepper";
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
  /** The user's accounts; a Girokonto or Tagesgeld among them can fund the
   *  repayment. Without one the Repayment group stays a note. */
  accounts?: AccountWithBalance[];
  onClose: () => void;
  onSuccess: (account: AccountWithBalance) => void;
}

interface RepaymentPayload {
  fundingAccountId: string;
  monthlyAmount: number;
  dayOfMonth: number;
  sondertilgungAmount?: number;
  sondertilgungMonth?: number;
}

interface MortgageSetupPayload {
  name: string;
  openingBalance: number;
  openingDate: string;
  originalPrincipal: number;
  startDate: string;
  termYears: number;
  repayment?: RepaymentPayload;
}

interface FormValues {
  name: string;
  restschuld: string;
  asOf: string;
  principal: string;
  startDate: string;
  term: string;
  paidFrom: string;
  rate: string;
  stAmount: string;
  stMonth: string;
}

/** The account kinds a repayment may be paid from. */
const FUNDING_KINDS: ReadonlySet<string> = new Set(["Girokonto", "Tagesgeld"]);

/** The Sondertilgung month a new setup starts at: November. */
const DEFAULT_ST_MONTH = "11";

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

/** The field rules of the Repayment group. No repayment when neither a
 *  monthly rate nor a Sondertilgung is typed; otherwise the first broken
 *  rule's message, or the repayment to send. */
function validateRepayment(
  values: FormValues,
  dayOfMonth: number
):
  | { ok: true; repayment: RepaymentPayload | undefined }
  | { ok: false; error: string } {
  if (values.rate.trim() === "" && values.stAmount.trim() === "") {
    return { ok: true, repayment: undefined };
  }
  if (values.paidFrom === "") {
    return {
      ok: false,
      error: "Choose the account the repayment is paid from.",
    };
  }
  const monthlyAmount = toCents(values.rate);
  if (Number.isNaN(monthlyAmount) || monthlyAmount <= 0) {
    return { ok: false, error: "Monthly rate must be above 0." };
  }
  const repayment: RepaymentPayload = {
    fundingAccountId: values.paidFrom,
    monthlyAmount,
    dayOfMonth,
  };
  if (values.stAmount.trim() !== "") {
    const stAmount = toCents(values.stAmount);
    if (Number.isNaN(stAmount) || stAmount <= 0) {
      return { ok: false, error: "Annual Sondertilgung must be above 0." };
    }
    if (values.stMonth === "") {
      return {
        ok: false,
        error: "Choose the month the Sondertilgung is paid in.",
      };
    }
    repayment.sondertilgungAmount = stAmount;
    repayment.sondertilgungMonth = Number(values.stMonth);
  }
  return { ok: true, repayment };
}

/** The field rules of every group: the first broken rule's message, or the
 *  payload to POST when every rule holds. */
function validate(
  values: FormValues,
  dayOfMonth: number
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

  const repayment = validateRepayment(values, dayOfMonth);
  if (!repayment.ok) return repayment;

  const payload: MortgageSetupPayload = {
    name,
    openingBalance: restschuld,
    openingDate: values.asOf,
    originalPrincipal: principal,
    startDate: values.startDate,
    termYears,
  };
  if (repayment.repayment) payload.repayment = repayment.repayment;
  return { ok: true, payload };
}

export default function MortgageSetupModal({
  accounts = [],
  onClose,
  onSuccess,
}: Props) {
  const fundingAccounts = accounts.filter((a) => FUNDING_KINDS.has(a.kind));
  const [values, setValues] = useState<FormValues>(() => ({
    name: "Mortgage",
    restschuld: "",
    asOf: todayIso(),
    principal: "",
    startDate: "",
    term: "",
    paidFrom: fundingAccounts[0]?.id ?? "",
    rate: "",
    stAmount: "",
    stMonth: DEFAULT_ST_MONTH,
  }));
  const [dayOfMonth, setDayOfMonth] = useState(1);
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

    const result = validate(values, dayOfMonth);
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
      setError(apiErrorMessage(await res.json(), "Failed to set up mortgage"));
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
          {fundingAccounts.length === 0 ? (
            <StyledNote>
              Add a Girokonto to set up the monthly repayment.
            </StyledNote>
          ) : (
            <>
              <FormField label="Paid from" htmlFor="mortgage-setup-paid-from">
                <Select
                  id="mortgage-setup-paid-from"
                  value={values.paidFrom}
                  onChange={(e) => set("paidFrom")(e.target.value)}
                >
                  {fundingAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Monthly rate" htmlFor="mortgage-setup-rate">
                <Input
                  id="mortgage-setup-rate"
                  type="number"
                  step="0.01"
                  value={values.rate}
                  onChange={(e) => set("rate")(e.target.value)}
                />
              </FormField>
              <FormField label="Day of month">
                <Stepper
                  value={dayOfMonth}
                  onChange={setDayOfMonth}
                  min={1}
                  max={31}
                />
              </FormField>
              <FormField
                label="Annual Sondertilgung"
                htmlFor="mortgage-setup-st-amount"
              >
                <Input
                  id="mortgage-setup-st-amount"
                  type="number"
                  step="0.01"
                  value={values.stAmount}
                  onChange={(e) => set("stAmount")(e.target.value)}
                />
              </FormField>
              <FormField label="In month" htmlFor="mortgage-setup-st-month">
                <Select
                  id="mortgage-setup-st-month"
                  value={values.stMonth}
                  onChange={(e) => set("stMonth")(e.target.value)}
                >
                  <option value="">—</option>
                  {MONTHS_LONG.map((month, i) => (
                    <option key={month} value={String(i + 1)}>
                      {month}
                    </option>
                  ))}
                </Select>
              </FormField>
            </>
          )}
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
