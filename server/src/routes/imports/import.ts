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

export const ImportCreateSchema = z.object({
  accountId: z.string().min(1),
  bank: z.string().min(1),
  filename: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  mapping: ColumnMappingSchema,
  rows: z.array(ImportRowSchema).min(1),
});
