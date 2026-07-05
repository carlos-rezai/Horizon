/**
 * A single statement row after column mapping, amount/date parsing, and
 * categorization — the engine's normalized output and the unit duplicate /
 * recurring detection operate on.
 */
export interface MappedRow {
  /** ISO date string. */
  date: string;
  description: string;
  /** Signed integer cents. */
  amount: number;
  category: string;
  /**
   * True when the source row is a not-yet-settled (pending / "vorgemerkt")
   * booking, per the preset's pendingColumn/pendingValues. Pending rows arrive
   * pre-unchecked in the wizard, like duplicates and recurring.
   */
  pending: boolean;
}
