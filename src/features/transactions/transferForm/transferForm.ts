import type {
  RecurringFrequency,
  RecurringTransaction,
  RecurringTransactionInput,
} from "../../../types/recurring";
import { transferSideFor } from "../../../utils/recurring/recurring";

/** Which way a Recurring Transfer moves, seen from the viewed account. */
export type TransferDirection = "to" | "from";

/** The transfer fields the recurring form starts from for an existing row. */
export interface TransferSeed {
  direction: TransferDirection;
  /** The other end of the transfer, or "" for a plain recurring. */
  counterpartId: string;
  /** In cents: absolute for a transfer, the stored sign for a plain row. */
  amount: number;
}

/**
 * Seed the form from an existing row, as the viewed account sees it. A
 * transfer is typed positive; a Mirrored Transfer Row (the viewed account is
 * its destination) is a "From" transfer whose counterpart is the source.
 */
export function seedTransferForm(
  transaction: RecurringTransaction,
  accountId: string
): TransferSeed {
  if (transaction.linkedAccountId === undefined) {
    return { direction: "to", counterpartId: "", amount: transaction.amount };
  }
  const incoming = transferSideFor(transaction, accountId) === "destination";
  return {
    direction: incoming ? "from" : "to",
    counterpartId: incoming
      ? transaction.accountId
      : transaction.linkedAccountId,
    amount: Math.abs(transaction.amount),
  };
}

/** The recurring form's values, already parsed. */
export interface RecurringFormValues {
  /** In cents. */
  amount: number;
  description: string;
  category: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  /** The other end of the transfer, or "" for a plain recurring. */
  counterpartId: string;
  direction: TransferDirection;
  monthOfYear: number;
}

/**
 * Build the payload from the form. A transfer is stored on its source, so a
 * "From" transfer flips the owner: the counterpart owns it and the viewed
 * account is its destination. `monthOfYear` is sent only for annual rows.
 */
export function buildRecurringInput(
  values: RecurringFormValues,
  accountId: string
): RecurringTransactionInput {
  const { counterpartId } = values;
  const isFrom = counterpartId !== "" && values.direction === "from";
  return {
    accountId: isFrom ? counterpartId : accountId,
    amount: values.amount,
    description: values.description,
    category: values.category,
    frequency: values.frequency,
    dayOfMonth: values.dayOfMonth,
    ...(counterpartId
      ? { linkedAccountId: isFrom ? accountId : counterpartId }
      : {}),
    ...(values.frequency === "annual"
      ? { monthOfYear: values.monthOfYear }
      : {}),
  };
}
