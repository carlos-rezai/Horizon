import { useState } from "react";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { AccountKind } from "../../../types/account";
import { accountIconSet, theme as meridianTheme } from "../../../tokens";
import { API_BASE } from "../../../utils/api/api";
import { eurosToCents } from "../../../utils/currency/currency";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import Select from "../../../primitives/Select/Select";
import Button from "../../../primitives/Button/Button";
import {
  StyledForm,
  StyledActions,
  StyledErrorText,
  StyledIconGrid,
  StyledIconButton,
  StyledColorRow,
  StyledColorSwatch,
} from "./AccountCreateModal.styles";

interface Props {
  onClose: () => void;
  onSuccess: (accountId: string) => void;
}

const ACCOUNT_KINDS: AccountKind[] = [
  "Girokonto",
  "Tagesgeld",
  "Mortgage",
  "CreditCard",
  "Investment",
];

const COLOR_PALETTE = meridianTheme.colors.accountColorPalette;

function randomPaletteColor(): string {
  return COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
}

export default function AccountCreateModal({ onClose, onSuccess }: Props) {
  const [kind, setKind] = useState<AccountKind>("Girokonto");
  const [name, setName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0.00");
  const [openingDate, setOpeningDate] = useState("");
  const [sondertilgungAllowance, setSondertilgungAllowance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(() =>
    randomPaletteColor()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !openingDate) return;

    const body: Record<string, unknown> = {
      kind,
      name: name.trim(),
      openingBalance: eurosToCents(openingBalance),
      openingDate,
      icon: selectedIcon,
      color: selectedColor,
    };

    if (kind === "Mortgage" && sondertilgungAllowance) {
      body.sondertilgungAllowance = eurosToCents(sondertilgungAllowance);
    }

    const res = await fetch(`${API_BASE}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as { id?: string; error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to create account");
      return;
    }

    onSuccess(data.id!);
  };

  return (
    <Modal onClose={onClose}>
      <StyledForm onSubmit={handleSubmit}>
        <FormField label="Kind" htmlFor="account-kind">
          <Select
            id="account-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as AccountKind)}
          >
            {ACCOUNT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Name" htmlFor="account-name">
          <Input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>

        <FormField label="Opening Balance" htmlFor="opening-balance">
          <Input
            id="opening-balance"
            type="number"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
        </FormField>

        <FormField label="Opening Date" htmlFor="opening-date">
          <Input
            id="opening-date"
            type="date"
            value={openingDate}
            onChange={(e) => setOpeningDate(e.target.value)}
          />
        </FormField>

        {kind === "Mortgage" && (
          <FormField
            label="Sondertilgung Allowance"
            htmlFor="sondertilgung-allowance"
          >
            <Input
              id="sondertilgung-allowance"
              type="number"
              step="0.01"
              value={sondertilgungAllowance}
              onChange={(e) => setSondertilgungAllowance(e.target.value)}
            />
          </FormField>
        )}

        <StyledIconGrid>
          {accountIconSet.map((iconName) => {
            const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as
              | React.ComponentType<LucideProps>
              | undefined;
            return (
              <StyledIconButton
                key={iconName}
                type="button"
                aria-label={iconName}
                $selected={selectedIcon === iconName}
                onClick={() =>
                  setSelectedIcon(selectedIcon === iconName ? null : iconName)
                }
              >
                {Icon && <Icon size={18} />}
              </StyledIconButton>
            );
          })}
        </StyledIconGrid>

        <StyledColorRow>
          {COLOR_PALETTE.map((color) => (
            <StyledColorSwatch
              key={color}
              type="button"
              aria-label={color}
              $color={color}
              $selected={selectedColor === color}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </StyledColorRow>

        {error && <StyledErrorText role="alert">{error}</StyledErrorText>}

        <StyledActions>
          <Button type="submit">Create account</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </StyledActions>
      </StyledForm>
    </Modal>
  );
}
