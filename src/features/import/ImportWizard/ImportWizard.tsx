import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  RefreshCw,
  Info,
  Banknote,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";
import { resolveAccountColor } from "../../../utils/color/color";
import Modal from "../../../components/Modal/Modal";
import Button from "../../../primitives/Button/Button";
import Select from "../../../primitives/Select/Select";
import Spinner from "../../../primitives/Spinner/Spinner";
import Money from "../../../primitives/Money/Money";
import { formatFileSizeKB, pluralize } from "../../../utils/format/format";
import type {
  CommitImportInput,
  ImportPreview as ImportPreviewData,
} from "../importTypes";
import { useImportWizard } from "../useImportWizard";
import type { RowFlag } from "../reviewRows";
import ReviewTable, { type FlagSpec } from "./ReviewTable/ReviewTable";
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
  StyledBlockedPill,
  StyledAttentionToggle,
  StyledFlagBadge,
  StyledFootnote,
} from "./ImportWizard.styles";

const STEP_LABELS = ["Account", "Map columns", "Review"];

// One spec per soft flag, the single source for both the per-row badge and the
// review-summary badge — so tone and icon are declared once and the two views
// can never drift. `label` is the terse per-row badge; `summaryLabel` is the
// counted summary phrasing. The per-row badges read straight off `row.flags`,
// so the count and the exclusion can never drift apart either.
const FLAG_SPECS: Record<RowFlag, FlagSpec> = {
  duplicate: {
    label: "Dupe",
    tone: "warn",
    Icon: Info,
    summaryLabel: (n) => pluralize(n, "likely duplicate"),
  },
  recurring: {
    label: "Recur",
    tone: "neutral",
    Icon: RefreshCw,
    summaryLabel: (n) => `${n} recurring`,
  },
  pending: {
    label: "Pending",
    tone: "neutral",
    Icon: Clock,
    summaryLabel: (n) => `${n} pending`,
  },
};

// Summary badges render in this order when their count is non-zero, matching
// the per-row badge order in `flagsFor`.
const FLAG_ORDER: RowFlag[] = ["duplicate", "recurring", "pending"];

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

  // "Needs attention" == the commit gate's own definition: included AND blocked.
  // Unchecking a row resolves it, so it leaves this set on its own.
  const blockedRows = useMemo(
    () => rows.filter((r) => r.included && r.blockers.length > 0),
    [rows]
  );
  const blockedCount = blockedRows.length;

  // The pill counts live blocked rows and hides at zero, but the filter control
  // outlives the last repair: once a statement has asked for attention the
  // toggle stays available for the session so a mid-repair fix doesn't yank it
  // out from under the user. Both reset when a fresh statement loads.
  const [everBlocked, setEverBlocked] = useState(false);
  const [attentionOnly, setAttentionOnly] = useState(false);
  useEffect(() => {
    setEverBlocked(false);
    setAttentionOnly(false);
  }, [data]);
  useEffect(() => {
    if (blockedCount > 0) setEverBlocked(true);
  }, [blockedCount]);

  // A view-only collapse to the blocked rows. When the last blocker clears the
  // filtered view is empty, so fall back to the full table rather than a void.
  const visibleRows = attentionOnly && blockedCount > 0 ? blockedRows : rows;

  // Focus the next blocked description input on each pill click, cycling in row
  // order. Refs are keyed by row id so the jump survives filtering and edits.
  const descRefs = useRef(new Map<string, HTMLInputElement>());
  const registerDescRef = (id: string, el: HTMLInputElement | null) => {
    if (el) descRefs.current.set(id, el);
    else descRefs.current.delete(id);
  };
  const jumpCursor = useRef(0);
  const jumpToNextBlocked = () => {
    if (blockedCount === 0) return;
    const target = blockedRows[jumpCursor.current % blockedCount];
    jumpCursor.current += 1;
    const el = descRefs.current.get(target.id);
    el?.scrollIntoView({ block: "center" });
    el?.focus();
  };

  // The summary count keyed by `RowFlag`, so the summary badges iterate the same
  // flag set the per-row badges do.
  const flagCounts: Record<RowFlag, number> = {
    duplicate: summary.duplicates,
    recurring: summary.recurring,
    pending: summary.pending,
  };

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
        {blockedCount > 0 && (
          <StyledBlockedPill type="button" onClick={jumpToNextBlocked}>
            <AlertCircle size={13} />
            {`${pluralize(blockedCount, "row")} ${blockedCount === 1 ? "needs" : "need"} a description`}
          </StyledBlockedPill>
        )}
        <Button
          variant="primary"
          icon="Check"
          onClick={confirm}
          disabled={
            summary.included === 0 || submitting || blocked || !canCommit
          }
        >
          {`Import ${pluralize(summary.included, "transaction")}`}
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
              {FLAG_ORDER.map((flag) => {
                const count = flagCounts[flag];
                if (count === 0) return null;
                const { tone, Icon, summaryLabel } = FLAG_SPECS[flag];
                return (
                  <StyledFlagBadge key={flag} $tone={tone}>
                    <Icon size={11} />
                    {summaryLabel(count)}
                  </StyledFlagBadge>
                );
              })}
              {everBlocked && (
                <StyledAttentionToggle
                  type="button"
                  $on={attentionOnly}
                  aria-pressed={attentionOnly}
                  onClick={() => setAttentionOnly((v) => !v)}
                >
                  <AlertCircle size={11} />
                  Needs attention
                </StyledAttentionToggle>
              )}
            </StyledReviewSummary>

            {rejected && rejected.count > 0 && (
              <StyledRejectedNote>
                <StyledRejectedText>
                  <Info size={13} />
                  {`${pluralize(rejected.count, "row")} couldn't be read — check your column mapping`}
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

            <ReviewTable
              rows={visibleRows}
              flagSpecs={FLAG_SPECS}
              toggle={toggle}
              setCategory={setCategory}
              setDescription={setDescription}
              registerDescRef={registerDescRef}
            />
            {submitError && <StyledNote>{submitError}</StyledNote>}
            <StyledFootnote>
              <Info size={13} />
              Duplicate, recurring, and pending rows are unchecked by default to
              avoid double-counting what Horizon already tracks or importing a
              booking that hasn't settled.
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
