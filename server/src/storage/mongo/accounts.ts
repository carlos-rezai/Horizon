import mongoose from "mongoose";
import { Account as AccountModel } from "../../models/Account.js";
import { Transaction } from "../../models/Transaction.js";
import type { AccountsRepo } from "../Storage.js";
import type { Account, AccountKind, AccountWithBalance } from "../types.js";

interface AccountDoc {
  _id: mongoose.Types.ObjectId;
  kind: AccountKind;
  name: string;
  openingBalance: number;
  openingDate: string;
  sondertilgungAllowance?: number;
}

interface AccountWithBalanceDoc extends AccountDoc {
  balance: number;
}

function toAccountDTO(doc: AccountDoc): Account {
  const dto: Account = {
    id: String(doc._id),
    kind: doc.kind,
    name: doc.name,
    openingBalance: doc.openingBalance,
    openingDate: doc.openingDate,
  };
  if (doc.sondertilgungAllowance !== undefined) {
    dto.sondertilgungAllowance = doc.sondertilgungAllowance;
  }
  return dto;
}

function toAccountWithBalanceDTO(
  doc: AccountWithBalanceDoc
): AccountWithBalance {
  return { ...toAccountDTO(doc), balance: doc.balance };
}

const balanceLookupStages: mongoose.PipelineStage[] = [
  {
    $lookup: {
      from: "transactions",
      localField: "_id",
      foreignField: "accountId",
      as: "txs",
    },
  },
  {
    $addFields: {
      balance: { $add: ["$openingBalance", { $sum: "$txs.amount" }] },
    },
  },
  { $project: { txs: 0 } },
];

export function createMongoAccountsRepo(): AccountsRepo {
  return {
    async create(input) {
      const doc = await AccountModel.create({
        kind: input.kind,
        name: input.name,
        openingBalance: input.openingBalance,
        openingDate: input.openingDate,
        ...(input.sondertilgungAllowance !== undefined && {
          sondertilgungAllowance: input.sondertilgungAllowance,
        }),
      });
      return toAccountDTO(doc.toObject() as AccountDoc);
    },

    async findAll() {
      const docs = await AccountModel.find().lean<AccountDoc[]>();
      return docs.map(toAccountDTO);
    },

    async findById(id) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await AccountModel.findById(id).lean<AccountDoc | null>();
      return doc ? toAccountDTO(doc) : null;
    },

    async update(id, input) {
      if (!mongoose.isValidObjectId(id)) return null;
      const update: Record<string, unknown> = {};
      if (input.name !== undefined) update.name = input.name;
      if (input.openingBalance !== undefined) {
        update.openingBalance = input.openingBalance;
      }
      if (input.sondertilgungAllowance !== undefined) {
        update.sondertilgungAllowance = input.sondertilgungAllowance;
      }
      const doc = await AccountModel.findByIdAndUpdate(id, update, {
        returnDocument: "after",
      }).lean<AccountDoc | null>();
      return doc ? toAccountDTO(doc) : null;
    },

    async delete(id) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = await AccountModel.findById(id);
      if (!doc) return null;
      const hasTransactions = await Transaction.exists({ accountId: doc._id });
      if (hasTransactions) return { ok: false, reason: "has_transactions" };
      await doc.deleteOne();
      return { ok: true };
    },

    async findAllWithBalance() {
      const docs =
        await AccountModel.aggregate<AccountWithBalanceDoc>(
          balanceLookupStages
        );
      return docs.map(toAccountWithBalanceDTO);
    },

    async findByIdWithBalance(id) {
      if (!mongoose.isValidObjectId(id)) return null;
      const objectId = new mongoose.Types.ObjectId(id);
      const docs = await AccountModel.aggregate<AccountWithBalanceDoc>([
        { $match: { _id: objectId } },
        ...balanceLookupStages,
      ]);
      if (docs.length === 0) return null;
      return toAccountWithBalanceDTO(docs[0]);
    },

    async getTotalLiquid() {
      const result = await AccountModel.aggregate<{ total: number }>([
        { $match: { kind: { $in: ["Girokonto", "Tagesgeld"] } } },
        {
          $lookup: {
            from: "transactions",
            localField: "_id",
            foreignField: "accountId",
            as: "txs",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $add: ["$openingBalance", { $sum: "$txs.amount" }],
              },
            },
          },
        },
      ]);
      return result.length > 0 ? result[0].total : 0;
    },
  };
}
