import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { Account as AccountModel } from "../../models/Account.js";
import { Transaction as TransactionModel } from "../../models/Transaction.js";
import type { TransfersRepo } from "../Storage.js";
import type { TransferCreateInput } from "../types.js";

async function bothAccountsExist(
  fromAccountId: string,
  toAccountId: string
): Promise<boolean> {
  if (
    !mongoose.isValidObjectId(fromAccountId) ||
    !mongoose.isValidObjectId(toAccountId)
  ) {
    return false;
  }
  const [from, to] = await Promise.all([
    AccountModel.findById(fromAccountId).lean(),
    AccountModel.findById(toAccountId).lean(),
  ]);
  return Boolean(from && to);
}

export function createMongoTransfersRepo(): TransfersRepo {
  return {
    async create(input: TransferCreateInput) {
      if (!(await bothAccountsExist(input.fromAccountId, input.toAccountId))) {
        return null;
      }

      const transferId = randomUUID();
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await TransactionModel.create(
            [
              {
                accountId: input.fromAccountId,
                date: input.date,
                amount: -input.amount,
                description: input.description,
                category: input.category,
                transferId,
              },
            ],
            { session }
          );
          await TransactionModel.create(
            [
              {
                accountId: input.toAccountId,
                date: input.date,
                amount: input.amount,
                description: input.description,
                category: input.category,
                transferId,
              },
            ],
            { session }
          );
        });
      } finally {
        await session.endSession();
      }

      return { transferId };
    },

    async delete(transferId: string) {
      const result = await TransactionModel.deleteMany({ transferId });
      return result.deletedCount > 0;
    },
  };
}
