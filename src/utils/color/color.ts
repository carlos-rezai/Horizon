import type { AccountKind } from "../../types/account";
import { chartColors } from "../../tokens/colors";

export function resolveAccountColor(account: {
  color?: string | null;
  kind: AccountKind;
}): string {
  return account.color ?? chartColors[account.kind];
}
