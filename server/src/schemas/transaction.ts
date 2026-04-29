import { z } from "zod";

export const TransactionCreateSchema = z.object({
  date: z.string().min(1),
  amount: z.number().int(),
  description: z.string().min(1),
  category: z.string().min(1),
});

export const TransactionUpdateSchema = z.object({
  date: z.string().min(1).optional(),
  amount: z.number().int().optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
});
