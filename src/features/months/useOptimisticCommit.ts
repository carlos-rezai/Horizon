import { useCallback } from "react";
import { ACCOUNTS, PROJECTION } from "../../components/CacheProvider/cacheKeys";
import { useCacheBump } from "../../components/CacheProvider/useCacheBump";
import { useOptionalNotify } from "../../components/SnackbarProvider/useSnackbar";
import type { Transaction } from "../../types/transaction";
import { readErrorMessage } from "../../utils/api/readErrorMessage";
import type { OptimisticEdit } from "../../utils/optimisticTransactions/optimisticTransactions";

let provisionalCount = 0;

/**
 * An id for a row the server has not seen yet. It only has to be unique among
 * the rows currently on screen — the server's own id replaces it in place as
 * soon as the create lands.
 */
export function provisionalId(): string {
  provisionalCount += 1;
  return `provisional-${provisionalCount}`;
}

/** Reads the stored row out of a successful response. */
export const storedRow = async (res: Response): Promise<Transaction | null> =>
  (await res.json()) as Transaction;

/** For mutations the server answers without a row to settle onto (a delete). */
export const noRow = async (): Promise<Transaction | null> => null;

export type CommitOptimistic = (
  edit: OptimisticEdit,
  send: () => Promise<Response>,
  readStoredRow: (res: Response) => Promise<Transaction | null>,
  failureMessage: string
) => Promise<boolean>;

/**
 * Runs one optimistic list mutation: paint the edit, send the request, then
 * either settle onto the row the server stored or put the exact previous list
 * back and tell the user why it did not stick.
 *
 * Returns whether the change landed, so a caller can follow up on success.
 */
export function useOptimisticCommit(
  setList: (list: Transaction[]) => void
): CommitOptimistic {
  const bump = useCacheBump();
  const notify = useOptionalNotify();

  return useCallback(
    async (edit, send, readStoredRow, failureMessage) => {
      // Paint first: the row the user just typed is on screen before the
      // request leaves.
      setList(edit.next);

      let res: Response;
      try {
        res = await send();
      } catch {
        setList(edit.rollback);
        notify(failureMessage, "error");
        return false;
      }

      if (!res.ok) {
        const message = await readErrorMessage(res, failureMessage);
        setList(edit.rollback);
        notify(message, "error");
        return false;
      }

      const stored = await readStoredRow(res);
      if (stored) setList(edit.settle(stored));

      // Every mutation here moves money, so the account balances and the whole
      // projection built on top of them are stale the moment it lands.
      bump(ACCOUNTS, PROJECTION);
      return true;
    },
    [setList, bump, notify]
  );
}
