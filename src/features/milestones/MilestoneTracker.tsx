import { useState } from "react";
import type { Milestone, NewMilestone } from "../../types/milestone";
import type { AccountWithBalance } from "../../types/account";
import type { MonthlySnapshot } from "../../types/projection";
import { findMilestoneMonth } from "../../utils/projection";

interface Props {
  milestones: Milestone[];
  accounts: AccountWithBalance[];
  snapshots: MonthlySnapshot[];
  onAdd: (data: NewMilestone) => void;
  onDelete: (id: string) => void;
}

function formatBalance(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function MilestoneTracker({
  milestones,
  accounts,
  snapshots,
  onAdd,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?._id ?? "");
  const [targetBalance, setTargetBalance] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAdd({ name, accountId, targetBalance: Number(targetBalance) });
    setName("");
    setTargetBalance("");
  }

  return (
    <section>
      <h2>Milestones</h2>

      <form onSubmit={handleSubmit}>
        <label htmlFor="milestone-name">Name</label>
        <input
          id="milestone-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label htmlFor="milestone-account">Account</label>
        <select
          id="milestone-account"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accounts.map((a) => (
            <option key={a._id} value={a._id}>
              {a.name}
            </option>
          ))}
        </select>

        <label htmlFor="milestone-target">Target Balance</label>
        <input
          id="milestone-target"
          type="number"
          value={targetBalance}
          onChange={(e) => setTargetBalance(e.target.value)}
        />

        <button type="submit">Add milestone</button>
      </form>

      {milestones.length === 0 ? (
        <p>No milestones yet.</p>
      ) : (
        <ul>
          {milestones.map((milestone) => {
            const account = accounts.find((a) => a._id === milestone.accountId);
            const completionMonth = account
              ? findMilestoneMonth(
                  snapshots,
                  milestone.accountId,
                  milestone.targetBalance,
                  account.kind
                )
              : null;

            return (
              <li key={milestone._id}>
                <span>{milestone.name}</span>
                <span>{account?.name ?? "Unknown account"}</span>
                <span>{formatBalance(milestone.targetBalance)}</span>
                {completionMonth === null ? (
                  <span>Not reached within 10-year horizon.</span>
                ) : (
                  <span>{completionMonth}</span>
                )}
                <button onClick={() => onDelete(milestone._id)}>Delete</button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
