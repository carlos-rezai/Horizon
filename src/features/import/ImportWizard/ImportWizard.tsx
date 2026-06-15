import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Info, Banknote } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";
import { resolveAccountColor } from "../../../utils/color/color";
import Modal from "../../../components/Modal/Modal";
import Button from "../../../primitives/Button/Button";
import Select from "../../../primitives/Select/Select";
import Money from "../../../primitives/Money/Money";
import { BANK_PRESETS, DEFAULT_BANK, type ColumnMapping } from "../bankPresets";
import type { PresetMemory } from "../presetMemory";
import { sampleParsedRows } from "../useImport";
import {
  buildReviewRows,
  summarizeReview,
  type ReviewRow,
} from "../reviewRows";
import {
  StyledWizard,
  StyledSteps,
  StyledStep,
  StyledStepDot,
  StyledStepLabel,
  StyledStepLine,
  StyledStack,
  StyledFileCard,
  StyledFileGlyph,
  StyledFileInfo,
  StyledFileName,
  StyledFileMeta,
  StyledFormatBadge,
  StyledFieldLabel,
  StyledChips,
  StyledChip,
  StyledNote,
  StyledMapHint,
  StyledMapCard,
  StyledMapField,
  StyledMapFieldLabel,
  StyledRawPreview,
  StyledRawRow,
  StyledReviewSummary,
  StyledSummaryText,
  StyledFlagBadge,
  StyledReviewHead,
  StyledReviewBody,
  StyledReviewRow,
  StyledCheck,
  StyledReviewDate,
  StyledReviewDesc,
  StyledReviewAmount,
  StyledFootnote,
} from "./ImportWizard.styles";

const STEP_LABELS = ["Account", "Map columns", "Review"];

interface Props {
  importAccounts: AccountWithBalance[];
  categories: Category[];
  presetMemory: PresetMemory;
  detectBank: (accountId: string) => string;
  presetAccountId: string | null;
  onClose: () => void;
  /** Fired on confirm with the chosen account and the included/skipped split. */
  onConfirm: (result: {
    account: AccountWithBalance;
    included: number;
    skipped: number;
  }) => void;
}

export default function ImportWizard({
  importAccounts,
  categories,
  presetMemory,
  detectBank,
  presetAccountId,
  onClose,
  onConfirm,
}: Props) {
  const [step, setStep] = useState(1);
  const [accountId, setAccountId] = useState(
    presetAccountId ?? importAccounts[0]?.id ?? ""
  );

  const bank = detectBank(accountId);
  const preset = BANK_PRESETS[bank] ?? BANK_PRESETS[DEFAULT_BANK];

  const [map, setMap] = useState<ColumnMapping>(() => presetMemory.get(bank));
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    buildReviewRows(sampleParsedRows())
  );

  // Re-apply the remembered preset whenever the target bank changes.
  useEffect(() => {
    setMap(presetMemory.get(bank));
  }, [bank, presetMemory]);

  const summary = summarizeReview(rows);
  const account =
    importAccounts.find((a) => a.id === accountId) ?? importAccounts[0];

  const rawRows = useMemo(() => sampleParsedRows().slice(0, 3), []);

  const categoryOptions = useMemo(() => {
    const names = new Set(categories.map((c) => c.name));
    rows.forEach((r) => names.add(r.cat));
    return [...names];
  }, [categories, rows]);

  const toggle = (id: string) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, included: !r.included } : r))
    );

  const setCat = (id: string, cat: string) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, cat } : r)));

  const updateMap = (patch: Partial<ColumnMapping>) =>
    setMap((m) => ({ ...m, ...patch }));

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const confirm = () => {
    // Persist any column-mapping adjustments for this bank's next import.
    presetMemory.remember(bank, map);
    if (account) {
      onConfirm({
        account,
        included: summary.included,
        skipped: rows.length - summary.included,
      });
    }
    onClose();
  };

  const footer =
    step === 1 ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" iconRight="ArrowRight" onClick={next}>
          Map columns
        </Button>
      </>
    ) : step === 2 ? (
      <>
        <Button variant="secondary" icon="ArrowLeft" onClick={back}>
          Back
        </Button>
        <Button variant="primary" iconRight="ArrowRight" onClick={next}>
          {`Review ${rows.length} rows`}
        </Button>
      </>
    ) : (
      <>
        <Button variant="secondary" icon="ArrowLeft" onClick={back}>
          Back
        </Button>
        <Button
          variant="primary"
          icon="Check"
          onClick={confirm}
          disabled={summary.included === 0}
        >
          {`Import ${summary.included} transaction${summary.included !== 1 ? "s" : ""}`}
        </Button>
      </>
    );

  return (
    <Modal title="Import statement" onClose={onClose} footer={footer}>
      <StyledWizard $wide={step === 3}>
        <StyledSteps>
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = n === step;
            const done = n < step;
            return (
              <Step
                key={label}
                label={label}
                n={n}
                active={active}
                done={done}
                showLine={i < STEP_LABELS.length - 1}
              />
            );
          })}
        </StyledSteps>

        {step === 1 && account && (
          <StyledStack>
            <StyledFileCard>
              <StyledFileGlyph>
                <Banknote size={20} />
              </StyledFileGlyph>
              <StyledFileInfo>
                <StyledFileName>{bank}_statement_2026-11.csv</StyledFileName>
                <StyledFileMeta>12 rows detected · 24 KB</StyledFileMeta>
              </StyledFileInfo>
              <StyledFormatBadge>
                <Check size={11} />
                {`${bank} format`}
              </StyledFormatBadge>
            </StyledFileCard>

            <div>
              <StyledFieldLabel>Import into account</StyledFieldLabel>
              <StyledChips>
                {importAccounts.map((a) => (
                  <StyledChip
                    key={a.id}
                    type="button"
                    $active={a.id === accountId}
                    $color={resolveAccountColor(a)}
                    onClick={() => setAccountId(a.id)}
                  >
                    {a.name}
                  </StyledChip>
                ))}
              </StyledChips>
              <StyledNote>
                Horizon detected this as a <strong>{bank}</strong> export and
                will apply your saved column mapping.
              </StyledNote>
            </div>
          </StyledStack>
        )}

        {step === 2 && (
          <StyledStack>
            <StyledMapHint>
              <RefreshCw size={14} />
              Mapping remembered from your last <strong>{bank}</strong> import —
              adjust if the columns changed.
            </StyledMapHint>
            <StyledMapCard>
              <MapField
                label="Date"
                value={map.date}
                columns={preset.columns}
                onChange={(v) => updateMap({ date: v })}
              />
              <MapField
                label="Description"
                value={map.desc}
                columns={preset.columns}
                onChange={(v) => updateMap({ desc: v })}
              />
              <MapField
                label="Amount"
                value={map.amount}
                columns={preset.columns}
                onChange={(v) => updateMap({ amount: v })}
              />
            </StyledMapCard>
            <div>
              <StyledFieldLabel>Raw preview · first rows</StyledFieldLabel>
              <StyledRawPreview>
                {rawRows.map((r, i) => (
                  <StyledRawRow key={r.id} $alt={i % 2 === 1}>
                    <span>{r.date}</span>
                    <span>{r.desc}</span>
                    <span>{(r.amount / 100).toFixed(2).replace(".", ",")}</span>
                  </StyledRawRow>
                ))}
              </StyledRawPreview>
            </div>
          </StyledStack>
        )}

        {step === 3 && (
          <div>
            <StyledReviewSummary>
              <StyledSummaryText>
                <strong>{summary.included}</strong> selected to import
              </StyledSummaryText>
              {summary.duplicates > 0 && (
                <StyledFlagBadge $tone="warn">
                  <Info size={11} />
                  {`${summary.duplicates} likely duplicate${summary.duplicates !== 1 ? "s" : ""}`}
                </StyledFlagBadge>
              )}
              {summary.recurring > 0 && (
                <StyledFlagBadge $tone="neutral">
                  <RefreshCw size={11} />
                  {`${summary.recurring} recurring`}
                </StyledFlagBadge>
              )}
            </StyledReviewSummary>

            <StyledReviewHead>
              <span />
              <span>Date</span>
              <span>Description</span>
              <span>Category</span>
              <span>Flag</span>
              <span>Amount</span>
            </StyledReviewHead>
            <StyledReviewBody>
              {rows.map((r, i) => (
                <StyledReviewRow
                  key={r.id}
                  $included={r.included}
                  $alt={i % 2 === 1}
                >
                  <StyledCheck
                    type="button"
                    $on={r.included}
                    aria-label="toggle"
                    aria-pressed={r.included}
                    onClick={() => toggle(r.id)}
                  >
                    {r.included && <Check size={12} />}
                  </StyledCheck>
                  <StyledReviewDate>{r.date.slice(5)}</StyledReviewDate>
                  <StyledReviewDesc>{r.desc}</StyledReviewDesc>
                  <Select
                    value={r.cat}
                    aria-label="category"
                    onChange={(e) => setCat(r.id, e.target.value)}
                  >
                    {categoryOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                  <span>
                    {r.duplicate ? (
                      <StyledFlagBadge $tone="warn">
                        <Info size={10} />
                        Dupe
                      </StyledFlagBadge>
                    ) : r.recurring ? (
                      <StyledFlagBadge $tone="neutral">
                        <RefreshCw size={10} />
                        Recur
                      </StyledFlagBadge>
                    ) : null}
                  </span>
                  <StyledReviewAmount>
                    <Money cents={r.amount} sign />
                  </StyledReviewAmount>
                </StyledReviewRow>
              ))}
            </StyledReviewBody>
            <StyledFootnote>
              <Info size={13} />
              Duplicates and recurring rows are unchecked by default to avoid
              double-counting what Horizon already tracks.
            </StyledFootnote>
          </div>
        )}
      </StyledWizard>
    </Modal>
  );
}

function Step({
  label,
  n,
  active,
  done,
  showLine,
}: {
  label: string;
  n: number;
  active: boolean;
  done: boolean;
  showLine: boolean;
}) {
  return (
    <>
      <StyledStep>
        <StyledStepDot $active={active} $done={done}>
          {done ? <Check size={13} /> : n}
        </StyledStepDot>
        <StyledStepLabel $active={active}>{label}</StyledStepLabel>
      </StyledStep>
      {showLine && <StyledStepLine />}
    </>
  );
}

function MapField({
  label,
  value,
  columns,
  onChange,
}: {
  label: string;
  value: string;
  columns: string[];
  onChange: (value: string) => void;
}) {
  return (
    <StyledMapField>
      <StyledMapFieldLabel>{label}</StyledMapFieldLabel>
      <Select
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
      >
        {columns.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
    </StyledMapField>
  );
}
