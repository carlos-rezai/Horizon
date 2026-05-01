import mongoose from "mongoose";
import { DEFAULT_CATEGORY_NAMES } from "../storage/defaultCategories.js";

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
