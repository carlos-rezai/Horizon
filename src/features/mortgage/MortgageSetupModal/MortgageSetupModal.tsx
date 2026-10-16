import { useState } from "react";
import type { AccountWithBalance } from "../../../types/account";
import { API_BASE } from "../../../utils/api/api";
import { apiErrorMessage } from "../../../utils/apiError/apiError";
import { percentPaidOff } from "../../../utils/mortgage/mortgage";
import { MONTHS_LONG } from "../../../utils/format/format";
import { theme as meridianTheme } from "../../../tokens";
import { todayIso } from "../../../utils/monthMath/monthMath";
import {
  toCents,
  validate,
  type FormValues,
} from "../mortgageSetupForm/mortgageSetupForm";
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

/** The account kinds a repayment may be paid from. */
const PAID_FROM_KINDS: ReadonlySet<string> = new Set([
  "Girokonto",
  "Tagesgeld",
]);

/** The account palette account creation picks a new account's colour from. */
const COLOR_PALETTE = meridianTheme.colors.accountColorPalette;

/** The Sondertilgung month a new setup starts at: November. */
const DEFAULT_ST_MONTH = "11";

export default function MortgageSetupModal({
  accounts = [],
  onClose,
  onSuccess,
}: Props) {
  const paidFromAccounts = accounts.filter((a) => PAID_FROM_KINDS.has(a.kind));
  const [values, setValues] = useState<FormValues>(() => ({
    name: "Mortgage",
    restschuld: "",
    asOf: todayIso(),
    principal: "",
    startDate: "",
    term: "",
    paidFrom: paidFromAccounts[0]?.id ?? "",
    rate: "",
    stAmount: "",
    stMonth: DEFAULT_ST_MONTH,
  }));
  const [dayOfMonth, setDayOfMonth] = useState(1);
  // Picked once per open, as account creation does.
  const [color] = useState(
    () => COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
  );
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
      body: JSON.stringify({ ...result.payload, color }),
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
              maxDate={todayIso()}
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
          {paidFromAccounts.length === 0 ? (
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
                  {paidFromAccounts.map((a) => (
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
