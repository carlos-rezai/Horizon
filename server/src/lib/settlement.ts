import type {
  Account,
  Transaction,
  TransferCreateInput,
} from "../storage/types.js";

export type SettlementTransferInput = TransferCreateInput & {
  isAutoSettlement: true;
};

function parseYearMonth(date: string): { year: number; month: number } {
  const [y, m] = date.split("-");
  return { year: Number(y), month: Number(m) };
}

function nextYearMonth(
  year: number,
  month: number
): { year: number; month: number } {
  return month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 };
}

function compareYearMonth(
  y1: number,
  m1: number,
  y2: number,
  m2: number
): number {
  return y1 !== y2 ? y1 - y2 : m1 - m2;
}

function firstDayOfNextMonth(year: number, month: number): string {
  const { year: ny, month: nm } = nextYearMonth(year, month);
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function computeMissingSettlements(
  accounts: Account[],
  transactions: Transaction[],
  asOf: string
): SettlementTransferInput[] {
  const result: SettlementTransferInput[] = [];
  const asOf_ = parseYearMonth(asOf);

  for (const cc of accounts) {
    if (cc.kind !== "CreditCard") continue;
    if (!cc.linkedAccountId || !cc.settlementDay || !cc.linkedSince) continue;

    const start = parseYearMonth(cc.linkedSince);
    const { linkedAccountId, settlementDay } = cc;

    const ccTxs = transactions.filter((tx) => tx.accountId === cc.id);
    const virtualSettlements: Array<{ date: string; amount: number }> = [];

    let { year, month } = start;
    while (compareYearMonth(year, month, asOf_.year, asOf_.month) <= 0) {
      const cutoff = firstDayOfNextMonth(year, month);
      const { year: sYear, month: sMonth } = nextYearMonth(year, month);
      const settlementDate = formatDate(sYear, sMonth, settlementDay);

      const alreadyExists =
        ccTxs.some((tx) => tx.isAutoSettlement && tx.date === settlementDate) ||
        virtualSettlements.some((v) => v.date === settlementDate);

      if (!alreadyExists) {
        const realBalance = ccTxs
          .filter((tx) => tx.date < cutoff)
          .reduce((sum, tx) => sum + tx.amount, 0);
        const virtualBalance = virtualSettlements
          .filter((v) => v.date < cutoff)
          .reduce((sum, v) => sum + v.amount, 0);
        const closingBalance = cc.openingBalance + realBalance + virtualBalance;

        if (closingBalance < 0) {
          const amount = -closingBalance;
          result.push({
            fromAccountId: linkedAccountId,
            toAccountId: cc.id,
            amount,
            date: settlementDate,
            description: "Auto-settlement",
            category: "Transfer",
            isAutoSettlement: true,
          });
          virtualSettlements.push({ date: settlementDate, amount });
        }
      }

      ({ year, month } = nextYearMonth(year, month));
    }
  }

  return result;
}
