import { z } from "zod";

export const ColumnMappingSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
  amount: z.string().min(1),
});

export const ImportRowSchema = z.object({
  date: z.string().min(1),
  amount: z.number().int(),
  description: z.string().min(1),
  category: z.string().min(1),
});

/**
 * A readable floor for a rejected commit. The row-level `issues` carry the
 * precise per-row detail; this is the one sentence shown when the client can't
 * (or needn't) pin every issue to a row. Missing descriptions are the common,
 * fixable case, so they get named; anything else falls back to the first issue.
 */
export function describeImportIssues(issues: z.ZodIssue[]): string {
  const missing = issues.filter(
    (i) => i.path[0] === "rows" && i.path[2] === "description"
  ).length;
  if (missing === 1) return "1 row needs a description before this can import.";
  if (missing > 1) {
    return `${missing} rows need a description before this can import.`;
  }
  return issues[0]?.message ?? "This statement could not be imported.";
}

export const ImportCreateSchema = z.object({
  accountId: z.string().min(1),
  bank: z.string().min(1),
  filename: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  mapping: ColumnMappingSchema,
  // The full remembered format echoed back from the preview. Optional with
  // German-bank defaults so older clients (and tests) still commit cleanly.
  delimiter: z.string().min(1).default(";"),
  decimal: z.string().min(1).default(","),
  dateFmt: z.string().min(1).default("DD.MM.YYYY"),
  rows: z.array(ImportRowSchema).min(1),
});
