import mongoose from "mongoose";

export type AccountKind =
  | "Girokonto"
  | "Tagesgeld"
  | "Mortgage"
  | "CreditCard"
  | "Investment";

const ACCOUNT_KINDS: AccountKind[] = [
  "Girokonto",
  "Tagesgeld",
  "Mortgage",
  "CreditCard",
  "Investment",
];

const accountSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ACCOUNT_KINDS, required: true },
    name: { type: String, required: true },
    openingBalance: { type: Number, required: true },
    openingDate: { type: String, required: true },
    sondertilgungAllowance: { type: Number },
  },
  {
    versionKey: false,
  }
);

export const Account = mongoose.model("Account", accountSchema);
