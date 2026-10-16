import { z } from "zod";

/**
 * The account kinds a Repayment Transfer may be paid from. Checked by the
 * route after parsing, since it needs the stored account. Duplicates the
 * client's `PAID_FROM_KINDS` across the tier boundary, by design.
 */
export const PAID_FROM_KINDS: ReadonlySet<string> = new Set([
  "Girokonto",
  "Tagesgeld",
]);

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const RepaymentSchema = z
  .object({
    paidFromAccountId: z.string().min(1),
    monthlyAmount: z.number().int().positive(),
    dayOfMonth: z.number().int().min(1).max(31),
    sondertilgungAmount: z.number().int().positive().optional(),
    sondertilgungMonth: z.number().int().min(1).max(12).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.sondertilgungAmount !== undefined &&
      data.sondertilgungMonth === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sondertilgungMonth"],
        message: "Choose the month the Sondertilgung is paid in",
      });
    }
  });

export const MortgageSetupSchema = z
  .object({
    name: z.string().min(1),
    openingBalance: z.number().int().positive(),
    openingDate: IsoDate,
    originalPrincipal: z.number().int().positive(),
    startDate: IsoDate,
    termYears: z.number().int().min(1).max(40),
    color: z.string().optional(),
    repayment: RepaymentSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.originalPrincipal < data.openingBalance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["originalPrincipal"],
        message: "Original principal cannot be below the Restschuld today",
      });
    }
    if (data.startDate > data.openingDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "Start date cannot be after the as-of date",
      });
    }
  });
