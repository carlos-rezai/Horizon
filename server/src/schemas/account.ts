import { z } from "zod";

const AccountKindEnum = z.enum([
  "Girokonto",
  "Tagesgeld",
  "Mortgage",
  "CreditCard",
  "Investment",
]);

export const AccountCreateSchema = z.object({
  kind: AccountKindEnum,
  name: z.string().min(1),
  openingBalance: z.number().int(),
  openingDate: z.string().min(1),
  sondertilgungAllowance: z.number().int().optional(),
});

export const AccountUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  openingBalance: z.number().int().optional(),
  sondertilgungAllowance: z.number().int().optional(),
});
