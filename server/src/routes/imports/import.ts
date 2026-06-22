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
  // The full remembered format echoed back from the preview. Optional with
  // German-bank defaults so older clients (and tests) still commit cleanly.
  delimiter: z.string().min(1).default(";"),
  decimal: z.string().min(1).default(","),
  dateFmt: z.string().min(1).default("DD.MM.YYYY"),
  rows: z.array(ImportRowSchema).min(1),
});
