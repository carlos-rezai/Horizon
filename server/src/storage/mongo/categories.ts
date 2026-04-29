import mongoose from "mongoose";
import { Category as CategoryModel } from "../../models/Category.js";
import { Transaction as TransactionModel } from "../../models/Transaction.js";
import type { CategoriesRepo } from "../Storage.js";
import type { Category } from "../types.js";

interface CategoryDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  isDefault: boolean;
}

function toCategoryDTO(doc: CategoryDoc): Category {
  return {
    id: String(doc._id),
    name: doc.name,
    isDefault: doc.isDefault,
  };
}

export function createMongoCategoriesRepo(): CategoriesRepo {
  return {
    async findAll() {
      const docs = await CategoryModel.find().lean<CategoryDoc[]>();
      return docs.map(toCategoryDTO);
    },

    async create(input) {
      const doc = await CategoryModel.create({
        name: input.name,
        isDefault: false,
      });
      return toCategoryDTO(doc.toObject() as CategoryDoc);
    },

    async delete(id) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await CategoryModel.findById(id).lean<CategoryDoc | null>();
      if (!doc) return null;
      if (doc.isDefault) return { ok: false, reason: "is_default" };
      const inUse = await TransactionModel.exists({ category: doc.name });
      if (inUse) return { ok: false, reason: "in_use" };
      await CategoryModel.deleteOne({ _id: doc._id });
      return { ok: true };
    },
  };
}
