import { useMemo, useState } from "react";
import { Check, RefreshCw, Info, Banknote } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";
import { resolveAccountColor } from "../../../utils/color/color";
import Modal from "../../../components/Modal/Modal";
import CategorySelect from "../../categories/CategorySelect/CategorySelect";
import Button from "../../../primitives/Button/Button";
import Select from "../../../primitives/Select/Select";
import Spinner from "../../../primitives/Spinner/Spinner";
import Money from "../../../primitives/Money/Money";
import { formatFileSizeKB } from "../../../utils/format/format";
import type {
  CommitImportInput,
  ImportPreview as ImportPreviewData,
} from "../importTypes";
import { useImportWizard } from "../useImportWizard";
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
  StyledRejectedNote,
  StyledRejectedText,
  StyledRejectedSamples,
  StyledRejectedSample,
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
  file: File;
  presetAccountId: string | null;
  preview: (accountId: string, file: File) => Promise<ImportPreviewData>;
  commit: (input: CommitImportInput) => Promise<void>;
  onClose: () => void;
  /** Fired after a successful commit with the included/skipped split. */
  onDone: (result: {
    account: AccountWithBalance;
    included: number;
    skipped: number;
  }) => void;
}

export default function ImportWizard({
  importAccounts,
  categories,
  file,
  presetAccountId,
  preview,
  commit,
  onClose,
  onDone,
}: Props) {
  const [step, setStep] = useState(1);
  const {
    accountId,
    account,
    selectAccount,
    data,
    loading,
    loadError,
    blocked,
    rows,
    map,
    summary,
    canCommit,
    submitting,
    submitError,
    toggle,
    setCategory,
    setDescription,
    updateMap,
    confirm,
  } = useImportWizard({
    importAccounts,
    categories,
    file,
    presetAccountId,
    preview,
    commit,
    onClose,
    onDone,
  });

  const bank = data?.bank ?? "…";
  const columns = data?.columns ?? [];
  // Rows dropped at parse have no date or amount to render, so they live here
  // rather than in the table — a diagnostic of the mapping, not a blocked row.
  const rejected = data?.summary.rejected;
  const rawRows = useMemo(() => rows.slice(0, 3), [rows]);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const footer =
    step === 1 ? (
      <>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          iconRight="ArrowRight"
          onClick={next}
          disabled={blocked}
        >
          Map columns
        </Button>
      </>
    ) : step === 2 ? (
      <>
        <Button variant="secondary" icon="ArrowLeft" onClick={back}>
          Back
        </Button>
        <Button
          variant="primary"
          iconRight="ArrowRight"
          onClick={next}
          disabled={blocked}
        >
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
          disabled={
            summary.included === 0 || submitting || blocked || !canCommit
          }
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

        {loadError && (
          <StyledNote>{`Could not read this file: ${loadError}`}</StyledNote>
        )}

        {step === 1 && account && (
          <StyledStack>
            <StyledFileCard>
              <StyledFileGlyph>
                <Banknote size={20} />
              </StyledFileGlyph>
              <StyledFileInfo>
                <StyledFileName title={file.name}>{file.name}</StyledFileName>
                <StyledFileMeta>
                  {loading
                    ? "Detecting…"
                    : `${data?.summary.total ?? 0} rows detected · ${formatFileSizeKB(file.size)} KB`}
                </StyledFileMeta>
              </StyledFileInfo>
              {loading ? (
                <Spinner size="small" />
              ) : (
                <StyledFormatBadge>
                  <Check size={11} />
                  {`${bank} format`}
                </StyledFormatBadge>
              )}
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
                    onClick={() => selectAccount(a.id)}
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
                columns={columns}
                onChange={(v) => updateMap({ date: v })}
              />
              <MapField
                label="Description"
                value={map.description}
                columns={columns}
                onChange={(v) => updateMap({ description: v })}
              />
              <MapField
                label="Amount"
                value={map.amount}
                columns={columns}
                onChange={(v) => updateMap({ amount: v })}
              />
            </StyledMapCard>
            <div>
              <StyledFieldLabel>Raw preview · first rows</StyledFieldLabel>
              <StyledRawPreview>
                {rawRows.map((r, i) => (
                  <StyledRawRow key={r.id} $alt={i % 2 === 1}>
                    <span>{r.date}</span>
                    <span>{r.description}</span>
                    <Money cents={r.amount} />
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

            {rejected && rejected.count > 0 && (
              <StyledRejectedNote>
                <StyledRejectedText>
                  <Info size={13} />
                  {`${rejected.count} row${rejected.count !== 1 ? "s" : ""} couldn't be read — check your column mapping`}
                </StyledRejectedText>
                <StyledRejectedSamples>
                  {rejected.samples.map((s, i) => (
                    <StyledRejectedSample key={i}>
                      <span>{s.date}</span>
                      <span>{s.amount}</span>
                    </StyledRejectedSample>
                  ))}
                </StyledRejectedSamples>
              </StyledRejectedNote>
            )}

            <StyledReviewHead>
              <span />
              <span>Date</span>
              <span>Description</span>
              <span>Category</span>
              <span>Flag</span>
              <span>Amount</span>
            </StyledReviewHead>
            <StyledReviewBody>
              {rows.map((r, i) => {
                // A blocker only surfaces on a row that will actually commit;
                // unchecking is the other way to resolve it.
                const showsError = r.included && r.blockers.length > 0;
                return (
                  <StyledReviewRow
                    key={r.id}
                    $included={r.included}
                    $alt={i % 2 === 1}
                    $blocked={showsError}
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
                    <StyledReviewDesc
                      value={r.description}
                      aria-label="Description"
                      aria-invalid={showsError}
                      placeholder={showsError ? "Add a description" : undefined}
                      $error={showsError}
                      onChange={(e) => setDescription(r.id, e.target.value)}
                    />
                    <CategorySelect
                      initialCategory={r.category}
                      onChange={(name) => setCategory(r.id, name)}
                    />
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
                );
              })}
            </StyledReviewBody>
            {submitError && <StyledNote>{submitError}</StyledNote>}
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
