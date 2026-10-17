/**
 * A single statement row after column mapping and amount/date parsing — the engine's normalized output and the unit duplicate /
 * recurring detection operate on.
 */
export interface MappedRow {
  /** ISO date string. */
  date: string;
  description: string;
  /** Signed integer cents. */
  amount: number;
  /**
   * The raw Counterparty as parsed — the preset's counterparty column, else
   * the description cell. A Category Rule is keyed on its normalised
   * Counterparty Key, never on an edited description.
   */
  counterparty: string;
  /**
   * True when the source row is a not-yet-settled (pending / "vorgemerkt")
   * booking, per the preset's pendingColumn/pendingValues. Pending rows arrive
   * pre-unchecked in the wizard, like duplicates and recurring.
   */
  pending: boolean;
}

/** Why a previewed row carries its category. */
export type CategorySource =
  | "learned"
  | "suggested"
  | "proposed"
  | "unmatched"
  | "chosen";
