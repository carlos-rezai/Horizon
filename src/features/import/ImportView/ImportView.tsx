import { useState } from "react";
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
  presetAccountId: string | null;
}

export default function ImportView() {
  const { accounts, isLoading, error } = useAccounts();
  const { categories } = useCategoriesWithInlineAdd();
  const { notify } = useSnackbar();
  const { importAccounts, history, presetMemory, detectBank } =
    useImport(accounts);

  const [activeAccountId, setActiveAccountId] = useState<string>(ALL);
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const [preview, setPreview] = useState<ImportedStatement | null>(null);

  if (isLoading) return <Spinner />;
  if (error) return <StyledErrorText>{`Error: ${error}`}</StyledErrorText>;

  const startImport = () => {
    setWizard({
      presetAccountId: activeAccountId === ALL ? null : activeAccountId,
    });
  };

  const accountFor = (id: string) => importAccounts.find((a) => a.id === id);

  return (
    <StyledImportView className="stagger">
      <PageHeader
        overline="Data"
        title="Import"
        subtitle="Bring bank statements into Horizon · everything stays on this device"
        actions={
          <Button variant="primary" icon="Upload" onClick={startImport}>
            New import
          </Button>
        }
      />

      <StyledDropzoneWrap>
        <Dropzone onPick={startImport} />
      </StyledDropzoneWrap>

      <StyledHistoryCard>
        <ImportHistory
          history={history}
          importAccounts={importAccounts}
          activeAccountId={activeAccountId}
          onAccountChange={setActiveAccountId}
          onStartImport={startImport}
          onPreview={(statement) => setPreview(statement)}
          onReimport={(f) =>
            notify(`Re-downloading “${f.filename}”`, { variant: "info" })
          }
          onRecat={(f) =>
            notify(
              `Re-categorizing ${f.count} transactions in “${f.filename}”`,
              { variant: "info" }
            )
          }
          onDelete={(f) =>
            notify(
              `Import “${f.filename}” deleted · ${f.count} transactions removed`,
              { variant: "success" }
            )
          }
        />
      </StyledHistoryCard>

      {wizard && (
        <ImportWizard
          importAccounts={importAccounts}
          categories={categories}
          presetMemory={presetMemory}
          detectBank={detectBank}
          presetAccountId={wizard.presetAccountId}
          onClose={() => setWizard(null)}
          onConfirm={({ account, included, skipped }) =>
            notify(
              `${included} transaction${included !== 1 ? "s" : ""} imported to ${account.name}${
                skipped > 0 ? ` · ${skipped} skipped` : ""
              }`,
              { variant: "success" }
            )
          }
        />
      )}

      {preview && (
        <ImportPreview
          statement={preview}
          account={accountFor(preview.accountId)}
          onClose={() => setPreview(null)}
        />
      )}
    </StyledImportView>
  );
}
