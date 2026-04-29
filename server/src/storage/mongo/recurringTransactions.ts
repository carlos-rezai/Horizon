import mongoose from "mongoose";
import { RecurringTransaction as RecurringTransactionModel } from "../../models/RecurringTransaction.js";
import type { RecurringTransactionsRepo } from "../Storage.js";
import type { Frequency, RecurringTransaction } from "../types.js";

interface RecurringTransactionDoc {
  _id: mongoose.Types.ObjectId;
  accountId: string;
  amount: number;
  description: string;
  category: string;
  frequency: Frequency;
  dayOfMonth: number;
  isActive: boolean;
  linkedAccountId?: string;
  monthOfYear?: number;
}

function toRecurringTransactionDTO(
  doc: RecurringTransactionDoc
): RecurringTransaction {
  const dto: RecurringTransaction = {
    id: String(doc._id),
    accountId: doc.accountId,
    amount: doc.amount,
    description: doc.description,
    category: doc.category,
    frequency: doc.frequency,
    dayOfMonth: doc.dayOfMonth,
    isActive: doc.isActive,
  };
  if (doc.linkedAccountId !== undefined) {
    dto.linkedAccountId = doc.linkedAccountId;
  }
  if (doc.monthOfYear !== undefined) {
    dto.monthOfYear = doc.monthOfYear;
  }
  return dto;
}

export function createMongoRecurringTransactionsRepo(): RecurringTransactionsRepo {
  return {
    async findAll() {
      const docs =
        await RecurringTransactionModel.find().lean<
          RecurringTransactionDoc[]
        >();
      return docs.map(toRecurringTransactionDTO);
    },

    async findActive() {
      const docs = await RecurringTransactionModel.find({
        isActive: true,
      }).lean<RecurringTransactionDoc[]>();
      return docs.map(toRecurringTransactionDTO);
    },

    async create(input) {
      const doc = await RecurringTransactionModel.create({
        accountId: input.accountId,
        amount: input.amount,
        description: input.description,
        category: input.category,
        frequency: input.frequency,
        dayOfMonth: input.dayOfMonth,
        ...(input.linkedAccountId !== undefined && {
          linkedAccountId: input.linkedAccountId,
        }),
        ...(input.monthOfYear !== undefined && {
          monthOfYear: input.monthOfYear,
        }),
      });
      return toRecurringTransactionDTO(
        doc.toObject() as RecurringTransactionDoc
      );
    },

    async update(id, input) {
      if (!mongoose.isValidObjectId(id)) return null;
      const update: Record<string, unknown> = {};
      if (input.amount !== undefined) update.amount = input.amount;
      if (input.description !== undefined)
        update.description = input.description;
      if (input.category !== undefined) update.category = input.category;
      if (input.isActive !== undefined) update.isActive = input.isActive;
      if (input.frequency !== undefined) update.frequency = input.frequency;
      if (input.dayOfMonth !== undefined) update.dayOfMonth = input.dayOfMonth;
      if (input.linkedAccountId !== undefined) {
        update.linkedAccountId = input.linkedAccountId;
      }
      if (input.monthOfYear !== undefined)
        update.monthOfYear = input.monthOfYear;
      const doc = await RecurringTransactionModel.findByIdAndUpdate(
        id,
        update,
        {
          returnDocument: "after",
        }
      ).lean<RecurringTransactionDoc | null>();
      return doc ? toRecurringTransactionDTO(doc) : null;
    },

    async delete(id) {
      if (!mongoose.isValidObjectId(id)) return false;
      const result = await RecurringTransactionModel.deleteOne({ _id: id });
      return result.deletedCount > 0;
    },
  };
}
