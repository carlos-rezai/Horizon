import type { AccountWithBalance } from "../../../types/account";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import Select from "../../../primitives/Select/Select";

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

      <FormField label="Settlement Day" htmlFor="settlement-day">
        <Input
          id="settlement-day"
          type="number"
          min="1"
          max="28"
          value={settlementDay}
          onChange={(e) => onSettlementDayChange(e.target.value)}
        />
      </FormField>
    </>
  );
}
