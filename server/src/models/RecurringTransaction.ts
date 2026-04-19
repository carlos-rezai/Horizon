import mongoose from "mongoose";

export type Frequency = "monthly" | "quarterly" | "annual";

const recurringTransactionSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    frequency: {
      type: String,
      enum: ["monthly", "quarterly", "annual"],
      required: true,
    },
    dayOfMonth: { type: Number, required: true },
    isActive: { type: Boolean, required: true, default: true },
    linkedAccountId: { type: String },
    monthOfYear: { type: Number },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret._id = String(ret._id);
        return ret;
      },
    },
  }
);

export const RecurringTransaction = mongoose.model(
  "RecurringTransaction",
  recurringTransactionSchema
);
