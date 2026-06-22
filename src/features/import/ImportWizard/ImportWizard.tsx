import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Info, Banknote } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";
import { resolveAccountColor } from "../../../utils/color/color";
import Modal from "../../../components/Modal/Modal";
import Button from "../../../primitives/Button/Button";
import Select from "../../../primitives/Select/Select";
import Spinner from "../../../primitives/Spinner/Spinner";
import Money from "../../../primitives/Money/Money";
import { formatFileSizeKB } from "../../../utils/format/format";
import type {
  ColumnMapping,
  ImportPreview as ImportPreviewData,
} from "../importTypes";
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
  file: File;
  presetAccountId: string | null;
  preview: (accountId: string, file: File) => Promise<ImportPreviewData>;
  commit: (input: {
    accountId: string;
    bank: string;
    filename: string;
    sizeBytes: number;
    mapping: ColumnMapping;
    rows: Array<{
      date: string;
      amount: number;
      description: string;
      category: string;
    }>;
  }) => Promise<void>;
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
  const [accountId, setAccountId] = useState(
    presetAccountId ?? importAccounts[0]?.id ?? ""
  );

  const [data, setData] = useState<ImportPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [map, setMap] = useState<ColumnMapping>({
    date: "",
    description: "",
    amount: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Upload for a fresh parse + detect whenever the target account changes:
  // duplicate/recurring flags are relative to that account. The loading flag
  // is flipped on in the account-change handler (and at mount) rather than in
  // this effect, keeping setState out of the synchronous effect body.
  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    preview(accountId, file)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setRows(buildReviewRows(result.rows));
        setMap(result.mapping);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, file, preview]);

  const selectAccount = (id: string) => {
    if (id === accountId) return;
    setLoading(true);
    setAccountId(id);
  };

  const summary = summarizeReview(rows);
  const account =
    importAccounts.find((a) => a.id === accountId) ?? importAccounts[0];
  const bank = data?.bank ?? "…";
  const columns = data?.columns ?? [];
  const rawRows = useMemo(() => rows.slice(0, 3), [rows]);

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

  const confirm = async () => {
    if (!account || !data) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await commit({
        accountId: account.id,
        bank: data.bank,
        filename: file.name,
        sizeBytes: file.size,
        mapping: map,
        rows: rows
          .filter((r) => r.included)
          .map((r) => ({
            date: r.date,
            amount: r.amount,
            description: r.desc,
            category: r.cat,
          })),
      });
      onDone({
        account,
        included: summary.included,
        skipped: rows.length - summary.included,
      });
      onClose();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Import failed");
      setSubmitting(false);
    }
  };

  const blocked = loading || loadError !== null;

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
          disabled={summary.included === 0 || submitting || blocked}
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
                <StyledFileName>{file.name}</StyledFileName>
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
