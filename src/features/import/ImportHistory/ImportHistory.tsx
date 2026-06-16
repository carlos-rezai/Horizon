import { useState } from "react";
import {
  Banknote,
  ChevronRight,
  Search,
  Filter,
  Download,
  Trash2,
  Upload,
} from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import { resolveAccountColor } from "../../../utils/color/color";
import Tabs, { type TabItem } from "../../../primitives/Tabs/Tabs";
import Button from "../../../primitives/Button/Button";
import Badge from "../../../primitives/Badge/Badge";
import EmptyState from "../../../components/EmptyState/EmptyState";
import type { ImportedStatement } from "../importTypes";
import {
  StyledHead,
  StyledHeadRow,
  StyledHeadTitle,
  StyledHeadMeta,
  StyledYearGroup,
  StyledYearHeader,
  StyledChevron,
  StyledYear,
  StyledSpacer,
  StyledYearCount,
  StyledYearTotal,
  StyledYearBody,
  StyledFileRow,
  StyledFileIcon,
  StyledFileMain,
  StyledFileName,
  StyledFileSub,
  StyledFileMeta,
  StyledFileRange,
  StyledFileCount,
  StyledActions,
  StyledActionBtn,
} from "./ImportHistory.styles";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

const ALL = "all";

interface Props {
  history: ImportedStatement[];
  importAccounts: AccountWithBalance[];
  activeAccountId: string;
  onAccountChange: (id: string) => void;
  onPreview: (statement: ImportedStatement) => void;
  onReimport: (statement: ImportedStatement) => void;
  onRecat: (statement: ImportedStatement) => void;
  onDelete: (statement: ImportedStatement) => void;
  onStartImport: () => void;
}

export default function ImportHistory({
  history,
  importAccounts,
  activeAccountId,
  onAccountChange,
  onPreview,
  onReimport,
  onRecat,
  onDelete,
  onStartImport,
}: Props) {
  // Default to the most recent year expanded (matches the prototype `05`).
  const [openYear, setOpenYear] = useState<number | null>(() => {
    const years = history.map((f) => f.year);
    return years.length > 0 ? Math.max(...years) : null;
  });

  const filtered =
    activeAccountId === ALL
      ? history
      : history.filter((f) => f.accountId === activeAccountId);

  const byYear = new Map<number, ImportedStatement[]>();
  filtered.forEach((f) => {
    const list = byYear.get(f.year) ?? [];
    list.push(f);
    byYear.set(f.year, list);
  });
  const years = [...byYear.keys()].sort((a, b) => b - a);

  const totalTx = filtered.reduce((s, f) => s + f.count, 0);

  const tabs: TabItem[] = [
    { id: ALL, label: "All accounts", count: history.length },
    ...importAccounts.map((a) => ({
      id: a.id,
      label: a.name,
      color: resolveAccountColor(a),
      count: history.filter((f) => f.accountId === a.id).length,
    })),
  ];

  const accountById = (id: string): AccountWithBalance | undefined =>
    importAccounts.find((a) => a.id === id);

  return (
    <>
      <StyledHead>
        <StyledHeadRow>
          <StyledHeadTitle>Import history</StyledHeadTitle>
          <StyledHeadMeta>
            {filtered.length} files · {totalTx.toLocaleString("de-DE")}{" "}
            transactions
          </StyledHeadMeta>
        </StyledHeadRow>
        <Tabs
          tabs={tabs}
          activeId={activeAccountId}
          onChange={onAccountChange}
        />
      </StyledHead>

      {years.length > 0 ? (
        years.map((year) => {
          const files = byYear.get(year) ?? [];
          const open = openYear === year;
          const yearTotal = files.reduce((s, f) => s + f.count, 0);
          return (
            <StyledYearGroup key={year}>
              <StyledYearHeader
                type="button"
                $open={open}
                onClick={() => setOpenYear(open ? null : year)}
              >
                <StyledChevron $open={open}>
                  <ChevronRight size={17} />
                </StyledChevron>
                <StyledYear>{year}</StyledYear>
                <StyledSpacer />
                <StyledYearCount>
                  {files.length} statement{files.length !== 1 ? "s" : ""}
                </StyledYearCount>
                <StyledYearTotal>
                  {yearTotal.toLocaleString("de-DE")} tx
                </StyledYearTotal>
              </StyledYearHeader>
              {open && (
                <StyledYearBody>
                  {files.map((file) => {
                    const account = accountById(file.accountId);
                    const color = account
                      ? resolveAccountColor(account)
                      : "#909AAE";
                    return (
                      <StyledFileRow key={file.id}>
                        <StyledFileIcon $color={color}>
                          <Banknote size={16} />
                        </StyledFileIcon>
                        <StyledFileMain>
                          <StyledFileName>{file.filename}</StyledFileName>
                          <StyledFileSub>
                            <Badge color={color}>
                              {account?.name ?? "Account"}
                            </Badge>
                            <StyledFileMeta>
                              {file.bank} · {file.sizeKB} KB
                            </StyledFileMeta>
                          </StyledFileSub>
                        </StyledFileMain>
                        <StyledFileRange>
                          {formatDay(file.from)} – {formatDay(file.to)}
                        </StyledFileRange>
                        <StyledFileCount>
                          {file.count}
                          <small> tx</small>
                        </StyledFileCount>
                        <StyledActions>
                          <StyledActionBtn
                            type="button"
                            title="Preview"
                            aria-label="Preview"
                            onClick={() => onPreview(file)}
                          >
                            <Search size={16} />
                          </StyledActionBtn>
                          <StyledActionBtn
                            type="button"
                            title="Re-categorize"
                            aria-label="Re-categorize"
                            onClick={() => onRecat(file)}
                          >
                            <Filter size={16} />
                          </StyledActionBtn>
                          <StyledActionBtn
                            type="button"
                            title="Re-download CSV"
                            aria-label="Re-download CSV"
                            onClick={() => onReimport(file)}
                          >
                            <Download size={16} />
                          </StyledActionBtn>
                          <StyledActionBtn
                            type="button"
                            $danger
                            title="Delete import"
                            aria-label="Delete import"
                            onClick={() => onDelete(file)}
                          >
                            <Trash2 size={16} />
                          </StyledActionBtn>
                        </StyledActions>
                      </StyledFileRow>
                    );
                  })}
                </StyledYearBody>
              )}
            </StyledYearGroup>
          );
        })
      ) : (
        <EmptyState
          icon={<Upload size={22} />}
          title="No imports yet"
          hint="Drop a CSV above to bring in transactions from this account. Horizon remembers each bank's format for next time."
          action={
            <Button
              variant="primary"
              size="sm"
              icon="Upload"
              onClick={onStartImport}
            >
              Import a statement
            </Button>
          }
        />
      )}
    </>
  );
}
