import { z } from "zod";

const FrequencyEnum = z.enum(["monthly", "quarterly", "annual"]);

export const RecurringTransactionCreateSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().int(),
  description: z.string().min(1),
  category: z.string().min(1),
  frequency: FrequencyEnum,
  dayOfMonth: z.number().int().min(1).max(31),
  linkedAccountId: z.string().min(1).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
});

export const RecurringTransactionUpdateSchema = z.object({
  amount: z.number().int().optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  frequency: FrequencyEnum.optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  linkedAccountId: z.string().min(1).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
});
