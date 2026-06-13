import { z } from "zod";

const AccountKindEnum = z.enum([
  "Girokonto",
  "Tagesgeld",
  "Mortgage",
  "CreditCard",
  "Investment",
]);

export const AccountCreateSchema = z
  .object({
    kind: AccountKindEnum,
    name: z.string().min(1),
    openingBalance: z.number().int(),
    openingDate: z.string().min(1),
    sondertilgungAllowance: z.number().int().optional(),
    icon: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    linkedAccountId: z.string().optional(),
    settlementDay: z.number().int().min(1).max(28).optional(),
    showInTrajectory: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const hasLinked = data.linkedAccountId !== undefined;
    const hasDay = data.settlementDay !== undefined;
    if (hasLinked !== hasDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "linkedAccountId and settlementDay must both be provided or both omitted",
      });
    }
  });

export const AccountUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  openingBalance: z.number().int().optional(),
  sondertilgungAllowance: z.number().int().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  linkedAccountId: z.string().nullable().optional(),
  settlementDay: z.number().int().min(1).max(28).optional(),
  showInTrajectory: z.boolean().optional(),
});
