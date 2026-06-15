import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAccounts } from "../../features/accounts/useAccounts";
import { useProjection } from "../../features/projection/useProjection";
import AccountHero from "../../features/accounts/AccountHero/AccountHero";
import AccountStatStrip from "../../features/accounts/AccountStatStrip/AccountStatStrip";
import AccountCreateModal from "../../features/accounts/AccountCreateModal/AccountCreateModal";
import RecurringTransactionList from "../../features/transactions/RecurringTransactionList/RecurringTransactionList";
import RecurringTransactionModal from "../../features/transactions/RecurringTransactionModal/RecurringTransactionModal";
import { useRecurringTransactions } from "../../features/transactions/useRecurringTransactions";
import Card from "../../components/Card/Card";
import SectionHead from "../../components/SectionHead/SectionHead";
import Button from "../../primitives/Button/Button";
import { API_BASE } from "../../utils/api/api";
import { recurringNetPerMonth } from "../../utils/recurring/recurring";
import { accountBalanceSeries } from "../../utils/accountSeries/accountSeries";
import type { Transaction } from "../../types/transaction";
import type { RecurringTransaction } from "../../types/recurring";
import {
  StyledPage,
  StyledSection,
  StyledBackLink,
  StyledErrorText,
} from "./AccountDetailPage.styles";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accounts, isLoading, error, refresh } = useAccounts();
  const { snapshots } = useProjection();
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
  if (error) return <StyledErrorText>{`Error: ${error}`}</StyledErrorText>;

  const account = accounts.find((a) => a.id === id);
  if (!account) return <p>Account not found.</p>;

  const handleDelete = async () => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to delete account");
    }
    navigate("/");
  };

  return (
    <StyledPage>
      <StyledBackLink to="/">
        <ArrowLeft size={16} /> Back to Dashboard
      </StyledBackLink>

      <AccountHero
        account={account}
        accounts={accounts}
        balanceSeries={accountBalanceSeries(snapshots, account.id)}
        hasTransactions={hasTransactions}
        onEdit={() => setShowEditAccount(true)}
        onDelete={handleDelete}
      />

      <AccountStatStrip
        openingBalance={account.openingBalance}
        openingDate={account.openingDate}
        recurringCount={recurringTransactions.length}
        recurringNet={recurringNetPerMonth(recurringTransactions, account.id)}
      />

      <StyledSection>
        <Card>
          <SectionHead
            label="Recurring"
            title="Recurring transactions"
            right={
              <Button
                variant="primary"
                size="sm"
                icon="Plus"
                onClick={() => setShowAddRecurring(true)}
              >
                Add recurring
              </Button>
            }
          />
          <RecurringTransactionList
            recurringTransactions={recurringTransactions}
            accounts={accounts}
            onRowClick={(rt) => setEditingRecurring(rt)}
          />
        </Card>
      </StyledSection>

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
    </StyledPage>
  );
}
