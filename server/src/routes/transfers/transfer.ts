import { z } from "zod";

export const TransferCreateSchema = z.object({
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().int(),
  date: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
});
