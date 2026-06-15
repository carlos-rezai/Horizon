import { useRef, useState } from "react";
import Button from "../../../primitives/Button/Button";
import Spinner from "../../../primitives/Spinner/Spinner";
import Text from "../../../primitives/Text/Text";
import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import { formatBytes } from "../../../utils/format/format";
import { downloadBackup } from "../downloadBackup";
import { uploadRestore } from "../uploadRestore";
import { useStorageStatus } from "../useStorageStatus";
import {
  Actions,
  ConfirmActions,
  ConfirmDialog,
  HiddenFileInput,
  IntegrityBadge,
  PathBox,
  PathLabel,
  PathValue,
  Stat,
  StatLabel,
  StatRow,
  StatValue,
} from "./StorageCard.styles";

type RestoreOutcome =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function StorageCard() {
  const { status, isLoading, error, refetch } = useStorageStatus();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [outcome, setOutcome] = useState<RestoreOutcome>({ kind: "idle" });

  if (isLoading) {
    return (
      <Card>
        <Spinner />
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <Text>{`Error: ${error}`}</Text>
      </Card>
    );
  }
  if (!status) return null;

  function handlePickFile(): void {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) setPendingFile(file);
    e.target.value = "";
  }

  function handleCancel(): void {
    setPendingFile(null);
  }

  async function handleConfirm(): Promise<void> {
    if (!pendingFile) return;
    setOutcome({ kind: "pending" });
    try {
      await uploadRestore(pendingFile);
      setPendingFile(null);
      setOutcome({ kind: "success" });
      await refetch();
    } catch (err) {
      setOutcome({
        kind: "error",
        message: err instanceof Error ? err.message : "Restore failed",
      });
    }
  }

  const integrityLabel =
    status.integrity === "ok"
      ? "Integrity OK"
      : `Integrity ${status.integrity}`;

  return (
    <Card>
      <SectionHead
        label="Storage"
        title="Database"
        right={<IntegrityBadge>{integrityLabel}</IntegrityBadge>}
      />
      {status.path !== undefined && (
        <PathBox>
          <PathLabel>Path</PathLabel>
          <PathValue>{status.path}</PathValue>
        </PathBox>
      )}
      <StatRow>
        {status.sizeBytes !== undefined && (
          <Stat>
            <StatLabel>Size</StatLabel>
            <StatValue>{formatBytes(status.sizeBytes)}</StatValue>
          </Stat>
        )}
        <Stat>
          <StatLabel>WAL mode</StatLabel>
          <StatValue $accent>active</StatValue>
        </Stat>
      </StatRow>
      {status.driver === "sqlite" && (
        <Actions>
          <Button
            variant="primary"
            icon="Download"
            onClick={() => {
              void downloadBackup();
            }}
          >
            Create backup
          </Button>
          <HiddenFileInput
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelected}
          />
          <Button variant="secondary" icon="Upload" onClick={handlePickFile}>
            Restore
          </Button>
        </Actions>
      )}
      {pendingFile && (
        <ConfirmDialog role="dialog" aria-label="Confirm restore">
          <Text>
            Restore from <strong>{pendingFile.name}</strong>? This will replace
            all live data.
          </Text>
          <ConfirmActions>
            <Button
              onClick={() => {
                void handleConfirm();
              }}
            >
              Confirm
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </ConfirmActions>
        </ConfirmDialog>
      )}
      {outcome.kind === "success" && <Text>Restore succeeded</Text>}
      {outcome.kind === "error" && <Text>{outcome.message}</Text>}
    </Card>
  );
}
