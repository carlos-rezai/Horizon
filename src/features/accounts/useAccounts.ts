import { ACCOUNTS } from "../../components/CacheProvider/cacheKeys";
import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { AccountWithBalance } from "../../types/account";
import { fetchJson } from "../../utils/api/fetchJson";

interface UseAccountsResult {
  accounts: AccountWithBalance[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Stable identity for the not-yet-loaded case, so consumers never see a fresh
 * array on every render.
 */
const NO_ACCOUNTS: AccountWithBalance[] = [];

function fetchAccounts(): Promise<AccountWithBalance[]> {
  return fetchJson<AccountWithBalance[]>("/accounts");
}

export function useAccounts(): UseAccountsResult {
  const { data, isLoading, error, refresh } = useCachedResource(
    ACCOUNTS,
    fetchAccounts
  );

  return { accounts: data ?? NO_ACCOUNTS, isLoading, error, refresh };
}
