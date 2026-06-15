import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAccounts } from "../../features/accounts/useAccounts";
import AccountDetailHeader from "../../features/accounts/AccountDetailHeader/AccountDetailHeader";
import AccountCreateModal from "../../features/accounts/AccountCreateModal/AccountCreateModal";
import RecurringTransactionList from "../../features/transactions/RecurringTransactionList/RecurringTransactionList";
import RecurringTransactionModal from "../../features/transactions/RecurringTransactionModal/RecurringTransactionModal";
import { useRecurringTransactions } from "../../features/transactions/useRecurringTransactions";
import Card from "../../components/Card/Card";
import Heading from "../../primitives/Heading/Heading";
import Button from "../../primitives/Button/Button";
import { API_BASE } from "../../utils/api/api";
import { recurringNetPerMonth } from "../../utils/recurring/recurring";
import { formatBalance } from "../../utils/format/format";
import type { Transaction } from "../../types/transaction";
import type { RecurringTransaction } from "../../types/recurring";
import {
  StyledPage,
  StyledSection,
  StyledActions,
  StyledStatStrip,
  StyledStat,
  StyledStatLabel,
  StyledStatValue,
} from "./AccountDetailPage.styles";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accounts, isLoading, error, refresh } = useAccounts();
  const {
    recurringTransactions,
    remove: removeRecurring,
    update: updateRecurring,
    create: createRecurring,
  } = useRecurringTransactions(id ?? "");
  const navigate = useNavigate();
  const [hasTransactions, setHasTransactions] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editingRecurring, setEditingRecurring] =
    useState<RecurringTransaction | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/accounts/${id}/transactions`)
      .then((r) => r.json() as Promise<Transaction[]>)
      .then((txs) => setHasTransactions(txs.length > 0))
      .catch(() => {});
  }, [id]);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {error}</p>;

  const account = accounts.find((a) => a.id === id);
  if (!account) return <p>Account not found.</p>;

  const handleRename = async (name: string) => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to rename account");
    }
  };

  const handleUpdateOpeningBalance = async (openingBalance: number) => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingBalance }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to update opening balance");
    }
    refresh();
  };

  const handleDelete = async () => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to delete account");
    }
    navigate("/");
  };

  return (
    <StyledPage>
      <Card>
        <Link to="/">← Back</Link>
        <AccountDetailHeader
          account={account}
          hasTransactions={hasTransactions}
          onEdit={() => setShowEditAccount(true)}
          onRename={handleRename}
          onUpdateOpeningBalance={handleUpdateOpeningBalance}
          onDelete={handleDelete}
        />
        {showEditAccount && (
          <AccountCreateModal
            account={account}
            onClose={() => setShowEditAccount(false)}
            onSuccess={() => {
              refresh();
              setShowEditAccount(false);
            }}
            girokontoAccounts={accounts.filter((a) => a.kind === "Girokonto")}
          />
        )}
      </Card>
      <Card>
        <StyledStatStrip>
          <StyledStat>
            <StyledStatLabel>Opening Balance</StyledStatLabel>
            <StyledStatValue>
              {formatBalance(account.openingBalance)}
            </StyledStatValue>
          </StyledStat>
          <StyledStat>
            <StyledStatLabel>Opening Date</StyledStatLabel>
            <StyledStatValue>
              {new Date(account.openingDate).toLocaleDateString("de-DE")}
            </StyledStatValue>
          </StyledStat>
          <StyledStat>
            <StyledStatLabel>Recurring</StyledStatLabel>
            <StyledStatValue>{recurringTransactions.length}</StyledStatValue>
          </StyledStat>
          <StyledStat>
            <StyledStatLabel>Recurring net / mo</StyledStatLabel>
            <StyledStatValue>
              {formatBalance(
                recurringNetPerMonth(recurringTransactions, account.id)
              )}
            </StyledStatValue>
          </StyledStat>
        </StyledStatStrip>
      </Card>
      <StyledSection>
        <Card>
          <Heading level={2}>Recurring Transactions</Heading>
          <StyledActions>
            <Button type="button" onClick={() => setShowAddRecurring(true)}>
              Add recurring transaction
            </Button>
          </StyledActions>
          <RecurringTransactionList
            recurringTransactions={recurringTransactions}
            accounts={accounts}
            onRowClick={(rt) => setEditingRecurring(rt)}
          />
          {showAddRecurring && (
            <RecurringTransactionModal
              accountId={account.id}
              otherAccounts={accounts.filter((a) => a.id !== account.id)}
              onClose={() => setShowAddRecurring(false)}
              onSaved={(formData) => {
                void createRecurring(formData);
                setShowAddRecurring(false);
              }}
              onDeleted={() => setShowAddRecurring(false)}
            />
          )}
          {editingRecurring && (
            <RecurringTransactionModal
              accountId={account.id}
              transaction={editingRecurring}
              otherAccounts={accounts.filter((a) => a.id !== account.id)}
              onClose={() => setEditingRecurring(null)}
              onSaved={(formData) => {
                void updateRecurring(editingRecurring.id, formData);
                setEditingRecurring(null);
              }}
              onDeleted={() => {
                void removeRecurring(editingRecurring.id);
                setEditingRecurring(null);
              }}
            />
          )}
        </Card>
      </StyledSection>
    </StyledPage>
  );
}
