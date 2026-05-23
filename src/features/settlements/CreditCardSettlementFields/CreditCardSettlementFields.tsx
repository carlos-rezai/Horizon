import type { AccountWithBalance } from "../../../types/account";
import FormField from "../../../components/FormField/FormField";
import Select from "../../../primitives/Select/Select";
import Stepper from "../../../primitives/Stepper/Stepper";

const DEFAULT_SETTLEMENT_DAY = 1;

interface Props {
  girokontoAccounts: AccountWithBalance[];
  linkedAccountId: string;
  settlementDay: string;
  onLinkedAccountChange: (id: string) => void;
  onSettlementDayChange: (day: string) => void;
}

export default function CreditCardSettlementFields({
  girokontoAccounts,
  linkedAccountId,
  settlementDay,
  onLinkedAccountChange,
  onSettlementDayChange,
}: Props) {
  const dayValue = settlementDay
    ? Number(settlementDay)
    : DEFAULT_SETTLEMENT_DAY;

  return (
    <>
      <FormField label="Funding Account" htmlFor="funding-account">
        <Select
          id="funding-account"
          value={linkedAccountId}
          onChange={(e) => onLinkedAccountChange(e.target.value)}
        >
          <option value="">— none —</option>
          {girokontoAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Settlement Day">
        <Stepper
          value={dayValue}
          onChange={(v) => onSettlementDayChange(String(v))}
          min={1}
          max={28}
        />
      </FormField>
    </>
  );
}
