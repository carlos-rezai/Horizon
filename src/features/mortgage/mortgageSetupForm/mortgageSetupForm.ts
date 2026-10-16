import { eurosToCents } from "../../../utils/currency/currency";

/**
 * The Mortgage Setup form's pure rules: its values, the payload it POSTs,
 * and the field validation that turns one into the other.
 */

export interface RepaymentPayload {
  paidFromAccountId: string;
  monthlyAmount: number;
  dayOfMonth: number;
  sondertilgungAmount?: number;
  sondertilgungMonth?: number;
}

export interface MortgageSetupPayload {
  name: string;
  anchorBalance: number;
  anchorDate: string;
  originalPrincipal: number;
  startDate: string;
  termYears: number;
  color?: string;
  repayment?: RepaymentPayload;
}

/** The form's raw field values, as typed. */
export interface FormValues {
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

/** Today as an ISO date (`YYYY-MM-DD`), in local time. */
export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Cents from a typed euro amount; NaN when the field is empty or not a number. */
export function toCents(euros: string): number {
  return euros.trim() === "" ? NaN : eurosToCents(euros);
}

/** The field rules of the Repayment group. No repayment when neither a
 *  monthly rate nor a Sondertilgung is typed; otherwise the first broken
 *  rule's message, or the repayment to send. */
export function validateRepayment(
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
    paidFromAccountId: values.paidFrom,
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
export function validate(
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
    anchorBalance: restschuld,
    anchorDate: values.asOf,
    originalPrincipal: principal,
    startDate: values.startDate,
    termYears,
  };
  if (repayment.repayment) payload.repayment = repayment.repayment;
  return { ok: true, payload };
}
