import mongoose from "mongoose";

export const DEFAULT_CATEGORY_NAMES = [
  "Income",
  "Housing",
  "Food",
  "Subscriptions",
  "Entertainment",
  "Investment",
  "Transfer",
  "Miscellaneous",
] as const;

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    isDefault: { type: Boolean, required: true, default: false },
  },
  {
    versionKey: false,
  }
);

export const Category = mongoose.model("Category", categorySchema);

export async function seedCategories() {
  for (const name of DEFAULT_CATEGORY_NAMES) {
    await Category.updateOne(
      { name },
      { $setOnInsert: { name, isDefault: true } },
      { upsert: true }
    );
  }
}
