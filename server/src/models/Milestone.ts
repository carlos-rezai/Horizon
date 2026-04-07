import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    accountId: { type: String, required: true },
    targetBalance: { type: Number, required: true },
  },
  {
    versionKey: false,
  }
);

export const Milestone = mongoose.model("Milestone", milestoneSchema);
