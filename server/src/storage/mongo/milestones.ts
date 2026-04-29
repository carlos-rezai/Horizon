import mongoose from "mongoose";
import { Account as AccountModel } from "../../models/Account.js";
import { Milestone as MilestoneModel } from "../../models/Milestone.js";
import type { MilestonesRepo } from "../Storage.js";
import type { Milestone } from "../types.js";

interface MilestoneDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  accountId: string;
  targetBalance: number;
}

function toMilestoneDTO(doc: MilestoneDoc): Milestone {
  return {
    id: String(doc._id),
    name: doc.name,
    accountId: doc.accountId,
    targetBalance: doc.targetBalance,
  };
}

export function createMongoMilestonesRepo(): MilestonesRepo {
  return {
    async findAll() {
      const docs = await MilestoneModel.find().lean<MilestoneDoc[]>();
      return docs.map(toMilestoneDTO);
    },

    async create(input) {
      if (!mongoose.isValidObjectId(input.accountId)) return null;
      const accountExists = await AccountModel.exists({ _id: input.accountId });
      if (!accountExists) return null;
      const doc = await MilestoneModel.create({
        name: input.name,
        accountId: input.accountId,
        targetBalance: input.targetBalance,
      });
      return toMilestoneDTO(doc.toObject() as MilestoneDoc);
    },

    async delete(id) {
      if (!mongoose.isValidObjectId(id)) return false;
      const result = await MilestoneModel.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },
  };
}
