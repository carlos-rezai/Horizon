import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { AccountWithBalance } from "../../types/account";
import { API_BASE } from "../../utils/api/api";

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

async function fetchAccounts(): Promise<AccountWithBalance[]> {
  const res = await fetch(`${API_BASE}/accounts`);
  if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`);
  return (await res.json()) as AccountWithBalance[];
}

export function useAccounts(): UseAccountsResult {
  const { data, isLoading, error, refresh } = useCachedResource(
    "accounts",
    fetchAccounts
  );

  return { accounts: data ?? NO_ACCOUNTS, isLoading, error, refresh };
}
