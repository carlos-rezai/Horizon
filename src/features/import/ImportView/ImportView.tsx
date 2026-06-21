import { useRef, useState } from "react";
import { useAccounts } from "../../accounts/useAccounts";
import { useCategoriesWithInlineAdd } from "../../categories/useCategoriesWithInlineAdd";
import { useSnackbar } from "../../../components/SnackbarProvider/useSnackbar";
import PageHeader from "../../../components/PageHeader/PageHeader";
import Button from "../../../primitives/Button/Button";
import Spinner from "../../../primitives/Spinner/Spinner";
import { useImport } from "../useImport";
import type { ImportedStatement } from "../importTypes";
import Dropzone from "../Dropzone/Dropzone";
import ImportHistory from "../ImportHistory/ImportHistory";
import ImportWizard from "../ImportWizard/ImportWizard";
import ImportPreview from "../ImportPreview/ImportPreview";
import {
  StyledImportView,
  StyledDropzoneWrap,
  StyledHistoryCard,
  StyledErrorText,
} from "./ImportView.styles";

const ALL = "all";

interface WizardState {
  file: File;
  presetAccountId: string | null;
}

export default function ImportView() {
  const { accounts, isLoading, error } = useAccounts();
  const { categories } = useCategoriesWithInlineAdd();
  const { notify } = useSnackbar();
  const { importAccounts, history, preview, commit, loadTransactions, remove } =
    useImport(accounts);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeAccountId, setActiveAccountId] = useState<string>(ALL);
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const [previewStatement, setPreviewStatement] =
    useState<ImportedStatement | null>(null);

  if (isLoading) return <Spinner />;
  if (error) return <StyledErrorText>{`Error: ${error}`}</StyledErrorText>;

  const startImport = (file: File) => {
    setWizard({
      file,
      presetAccountId: activeAccountId === ALL ? null : activeAccountId,
    });
  };

  const openPicker = () => fileInputRef.current?.click();

  const accountFor = (id: string) => importAccounts.find((a) => a.id === id);

  const openPreview = async (statement: ImportedStatement) => {
    try {
      const txns = await loadTransactions(statement.id);
      setPreviewStatement({ ...statement, txns });
    } catch {
      notify("Could not load these transactions", { variant: "error" });
    }
  };

  const deleteImport = async (statement: ImportedStatement) => {
    try {
      await remove(statement.id);
      notify(
        `Import “${statement.filename}” deleted · ${statement.count} transactions removed`,
        { variant: "success" }
      );
    } catch {
      notify("Could not delete this import", { variant: "error" });
    }
  };

  return (
    <StyledImportView className="stagger">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) startImport(file);
          e.target.value = "";
        }}
      />

      <PageHeader
        overline="Data"
        title="Import"
        subtitle="Bring bank statements into Horizon · everything stays on this device"
        actions={
          <Button variant="primary" icon="Upload" onClick={openPicker}>
            New import
          </Button>
        }
      />

      <StyledDropzoneWrap>
        <Dropzone onFile={startImport} />
      </StyledDropzoneWrap>

      <StyledHistoryCard>
        <ImportHistory
          history={history}
          importAccounts={importAccounts}
          activeAccountId={activeAccountId}
          onAccountChange={setActiveAccountId}
          onStartImport={openPicker}
          onPreview={openPreview}
          onDelete={deleteImport}
        />
      </StyledHistoryCard>

      {wizard && (
        <ImportWizard
          importAccounts={importAccounts}
          categories={categories}
          file={wizard.file}
          presetAccountId={wizard.presetAccountId}
          preview={preview}
          commit={commit}
          onClose={() => setWizard(null)}
          onDone={({ account, included, skipped }) =>
            notify(
              `${included} transaction${included !== 1 ? "s" : ""} imported to ${account.name}${
                skipped > 0 ? ` · ${skipped} skipped` : ""
              }`,
              { variant: "success" }
            )
          }
        />
      )}

      {previewStatement && (
        <ImportPreview
          statement={previewStatement}
          account={accountFor(previewStatement.accountId)}
          onClose={() => setPreviewStatement(null)}
        />
      )}
    </StyledImportView>
  );
}
