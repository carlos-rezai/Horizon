import { useRef, useState } from "react";
import Button from "../../../primitives/Button/Button";
import Spinner from "../../../primitives/Spinner/Spinner";
import Text from "../../../primitives/Text/Text";
import { downloadBackup } from "../downloadBackup";
import { uploadRestore } from "../uploadRestore";
import { useStorageStatus } from "../useStorageStatus";
import {
  Actions,
  ConfirmActions,
  ConfirmDialog,
  Container,
  HiddenFileInput,
  StatusLabel,
  StatusList,
  StatusValue,
} from "./StorageStatus.styles";

type RestoreOutcome =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function StorageStatus() {
  const { status, isLoading, error, refetch } = useStorageStatus();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [outcome, setOutcome] = useState<RestoreOutcome>({ kind: "idle" });

  if (isLoading) return <Spinner />;
  if (error) return <Text>{`Error: ${error}`}</Text>;
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

  return (
    <Container>
      <StatusList>
        <StatusLabel>Driver</StatusLabel>
        <StatusValue>{status.driver}</StatusValue>
        <StatusLabel>Schema version</StatusLabel>
        <StatusValue>{String(status.schemaVersion)}</StatusValue>
        <StatusLabel>Integrity</StatusLabel>
        <StatusValue>{status.integrity}</StatusValue>
        {status.path !== undefined && (
          <>
            <StatusLabel>Path</StatusLabel>
            <StatusValue>{status.path}</StatusValue>
          </>
        )}
        {status.sizeBytes !== undefined && (
          <>
            <StatusLabel>Bytes on disk</StatusLabel>
            <StatusValue>{String(status.sizeBytes)}</StatusValue>
          </>
        )}
      </StatusList>
      {status.driver === "sqlite" && (
        <Actions>
          <Button
            onClick={() => {
              void downloadBackup();
            }}
          >
            Download backup
          </Button>
          <HiddenFileInput
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelected}
          />
          <Button onClick={handlePickFile}>Restore from backup</Button>
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
            <Button onClick={handleCancel}>Cancel</Button>
          </ConfirmActions>
        </ConfirmDialog>
      )}
      {outcome.kind === "success" && <Text>Restore succeeded</Text>}
      {outcome.kind === "error" && <Text>{outcome.message}</Text>}
    </Container>
  );
}
