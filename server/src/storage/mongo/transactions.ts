import mongoose from "mongoose";
import { Account as AccountModel } from "../../models/Account.js";
import { Transaction as TransactionModel } from "../../models/Transaction.js";
import type { TransactionsRepo } from "../Storage.js";
import type { Transaction } from "../types.js";

interface TransactionDoc {
  _id: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  date: string;
  amount: number;
  description: string;
  category: string;
  transferId?: string;
  recurringTransactionId?: string;
}

function toTransactionDTO(doc: TransactionDoc): Transaction {
  const dto: Transaction = {
    id: String(doc._id),
    accountId: String(doc.accountId),
    date: doc.date,
    amount: doc.amount,
    description: doc.description,
    category: doc.category,
  };
  if (doc.transferId !== undefined) dto.transferId = doc.transferId;
  if (doc.recurringTransactionId !== undefined) {
    dto.recurringTransactionId = doc.recurringTransactionId;
  }
  return dto;
}

function nextMonthStart(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const m = Number(monthStr);
  const nextYear = m === 12 ? year + 1 : year;
  const nextMonth = m === 12 ? 1 : m + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export function createMongoTransactionsRepo(): TransactionsRepo {
  return {
    async findAll() {
      const docs = await TransactionModel.find()
        .sort({ date: -1 })
        .lean<TransactionDoc[]>();
      return docs.map(toTransactionDTO);
    },

    async findByAccount(accountId, opts) {
      if (!mongoose.isValidObjectId(accountId)) return [];
      const filter: Record<string, unknown> = { accountId };
      if (opts?.month) {
        filter.date = {
          $gte: `${opts.month}-01`,
          $lt: nextMonthStart(opts.month),
        };
      }
      const docs = await TransactionModel.find(filter)
        .sort({ date: -1 })
        .lean<TransactionDoc[]>();
      return docs.map(toTransactionDTO);
    },

    async findByTransferId(transferId) {
      const docs = await TransactionModel.find({ transferId }).lean<
        TransactionDoc[]
      >();
      return docs.map(toTransactionDTO);
    },

    async create(accountId, input) {
      if (!mongoose.isValidObjectId(accountId)) return null;
      const account = await AccountModel.findById(accountId).lean();
      if (!account) return null;
      const doc = await TransactionModel.create({
        accountId,
        date: input.date,
        amount: input.amount,
        description: input.description,
        category: input.category,
      });
      return toTransactionDTO(doc.toObject() as TransactionDoc);
    },

    async update(id, input) {
      if (!mongoose.isValidObjectId(id)) return null;
      const update: Record<string, unknown> = {};
      if (input.amount !== undefined) update.amount = input.amount;
      if (input.description !== undefined)
        update.description = input.description;
      if (input.category !== undefined) update.category = input.category;
      if (input.date !== undefined) update.date = input.date;
      const doc = await TransactionModel.findByIdAndUpdate(id, update, {
        returnDocument: "after",
      }).lean<TransactionDoc | null>();
      return doc ? toTransactionDTO(doc) : null;
    },

    async delete(id) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await TransactionModel.findById(
        id
      ).lean<TransactionDoc | null>();
      if (!doc) return null;
      if (doc.transferId) {
        return { ok: false, reason: "is_transfer_leg" };
      }
      await TransactionModel.deleteOne({ _id: doc._id });
      return { ok: true };
    },
  };
}
