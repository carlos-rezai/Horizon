import { z } from "zod";

const FrequencyEnum = z.enum(["monthly", "quarterly", "annual"]);

const RecurringTransactionBaseSchema = z.object({
  accountId: z.string().min(1),
  amount: z.number().int(),
  description: z.string().min(1),
  category: z.string().min(1),
  frequency: FrequencyEnum,
  dayOfMonth: z.number().int().min(1).max(31),
  linkedAccountId: z.string().min(1).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
});

interface TransferRuleRow {
  accountId: string;
  amount: number;
  linkedAccountId?: string;
}

export interface TransferRuleIssue {
  code: "custom";
  path: string[];
  message: string;
}

/**
 * Rules a linked (transfer) row must satisfy: a positive amount — the
 * direction is carried by which account owns the row — and a link to a
 * different account. Checked on create and on the merged PATCH row.
 */
export function transferRuleIssues(row: TransferRuleRow): TransferRuleIssue[] {
  if (row.linkedAccountId === undefined) return [];
  const issues: TransferRuleIssue[] = [];
  if (row.amount <= 0) {
    issues.push({
      code: "custom",
      path: ["amount"],
      message: "A transfer amount must be positive",
    });
  }
  if (row.linkedAccountId === row.accountId) {
    issues.push({
      code: "custom",
      path: ["linkedAccountId"],
      message: "A transfer cannot link an account to itself",
    });
  }
  return issues;
}

export const RecurringTransactionCreateSchema =
  RecurringTransactionBaseSchema.superRefine((row, ctx) => {
    transferRuleIssues(row).forEach((issue) =>
      ctx.addIssue({ code: "custom", path: issue.path, message: issue.message })
    );
  });

export const RecurringTransactionUpdateSchema = z.object({
  accountId: z.string().min(1).optional(),
  amount: z.number().int().optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  frequency: FrequencyEnum.optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  linkedAccountId: z.string().min(1).optional(),
  monthOfYear: z.number().int().min(1).max(12).optional(),
});
