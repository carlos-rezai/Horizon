import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    transferId: { type: String },
    recurringTransactionId: { type: String },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret._id = String(ret._id);
        ret.accountId = String(ret.accountId);
        return ret;
      },
    },
  }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
