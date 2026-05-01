import { useState } from "react";
import type { Milestone, NewMilestone } from "../../../types/milestone";
import type { AccountWithBalance } from "../../../types/account";
import type { MonthlySnapshot } from "../../../types/projection";
import { findMilestoneMonth } from "../../../utils/projection";
import { formatBalance } from "../../../utils/format";
import Heading from "../../../primitives/Heading/Heading";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import Select from "../../../primitives/Select/Select";
import Button from "../../../primitives/Button/Button";
import {
  StyledSection,
  StyledForm,
  StyledFormRow,
  StyledMilestoneList,
  StyledMilestoneCard,
  StyledMilestoneName,
  StyledMilestoneDetail,
  StyledEmptyState,
  StyledErrorText,
} from "./MilestoneTracker.styles";

interface Props {
  milestones: Milestone[];
  accounts: AccountWithBalance[];
  snapshots: MonthlySnapshot[];
  onAdd: (data: NewMilestone) => Promise<void>;
  onDelete: (id: string) => void;
}

export default function MilestoneTracker({
  milestones,
  accounts,
  snapshots,
  onAdd,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [targetBalance, setTargetBalance] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const isValid = name.trim() !== "" && targetBalance !== "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    try {
      await onAdd({ name, accountId, targetBalance: Number(targetBalance) });
      setName("");
      setTargetBalance("");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to add milestone"
      );
    }
  }

  return (
    <StyledSection>
      <Heading level={2}>Milestones</Heading>

      <StyledForm onSubmit={handleSubmit}>
        <StyledFormRow>
          <FormField label="Name" htmlFor="milestone-name">
            <Input
              id="milestone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>

          <FormField label="Account" htmlFor="milestone-account">
            <Select
              id="milestone-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Target Balance" htmlFor="milestone-target">
            <Input
              id="milestone-target"
              type="number"
              value={targetBalance}
              onChange={(e) => setTargetBalance(e.target.value)}
            />
          </FormField>
        </StyledFormRow>

        <Button type="submit" disabled={!isValid}>
          Add milestone
        </Button>
        {submitError !== null && (
          <StyledErrorText>{submitError}</StyledErrorText>
        )}
      </StyledForm>

      {milestones.length === 0 ? (
        <StyledEmptyState>No milestones yet.</StyledEmptyState>
      ) : (
        <StyledMilestoneList>
          {milestones.map((milestone) => {
            const account = accounts.find((a) => a.id === milestone.accountId);
            const completionMonth = account
              ? findMilestoneMonth(
                  snapshots,
                  milestone.accountId,
                  milestone.targetBalance,
                  account.kind
                )
              : null;

            return (
              <StyledMilestoneCard key={milestone.id}>
                <StyledMilestoneName>{milestone.name}</StyledMilestoneName>
                <StyledMilestoneDetail>
                  {account?.name ?? "Unknown account"}
                </StyledMilestoneDetail>
                <StyledMilestoneDetail>
                  {formatBalance(milestone.targetBalance)}
                </StyledMilestoneDetail>
                {completionMonth === null ? (
                  <StyledMilestoneDetail>
                    Not reached within 10-year horizon.
                  </StyledMilestoneDetail>
                ) : (
                  <StyledMilestoneDetail>
                    {completionMonth}
                  </StyledMilestoneDetail>
                )}
                <Button variant="danger" onClick={() => onDelete(milestone.id)}>
                  Delete
                </Button>
              </StyledMilestoneCard>
            );
          })}
        </StyledMilestoneList>
      )}
    </StyledSection>
  );
}
