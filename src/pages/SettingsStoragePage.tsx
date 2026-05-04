import { useRef, useState } from "react";
import Button from "../primitives/Button/Button";
import Heading from "../primitives/Heading/Heading";
import Spinner from "../primitives/Spinner/Spinner";
import Text from "../primitives/Text/Text";
import { downloadBackup } from "../features/settings/downloadBackup";
import { uploadRestore } from "../features/settings/uploadRestore";
import { useStorageStatus } from "../features/settings/useStorageStatus";

type RestoreOutcome =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function SettingsStoragePage() {
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
    <div>
      <Heading level={1}>Storage</Heading>
      <dl>
        <dt>
          <Text>Driver</Text>
        </dt>
        <dd>
          <Text>{status.driver}</Text>
        </dd>
        <dt>
          <Text>Schema version</Text>
        </dt>
        <dd>
          <Text>{String(status.schemaVersion)}</Text>
        </dd>
        <dt>
          <Text>Integrity</Text>
        </dt>
        <dd>
          <Text>{status.integrity}</Text>
        </dd>
        {status.path !== undefined && (
          <>
            <dt>
              <Text>Path</Text>
            </dt>
            <dd>
              <Text>{status.path}</Text>
            </dd>
          </>
        )}
        {status.sizeBytes !== undefined && (
          <>
            <dt>
              <Text>Bytes on disk</Text>
            </dt>
            <dd>
              <Text>{String(status.sizeBytes)}</Text>
            </dd>
          </>
        )}
      </dl>
      {status.driver === "sqlite" && (
        <Button
          onClick={() => {
            void downloadBackup();
          }}
        >
          Download backup
        </Button>
      )}
      {status.driver === "sqlite" && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFileSelected}
          />
          <Button onClick={handlePickFile}>Restore from backup</Button>
        </>
      )}
      {pendingFile && (
        <div role="dialog" aria-label="Confirm restore">
          <Text>
            Restore from <strong>{pendingFile.name}</strong>? This will replace
            all live data.
          </Text>
          <Button
            onClick={() => {
              void handleConfirm();
            }}
          >
            Confirm
          </Button>
          <Button onClick={handleCancel}>Cancel</Button>
        </div>
      )}
      {outcome.kind === "success" && <Text>Restore succeeded</Text>}
      {outcome.kind === "error" && <Text>{outcome.message}</Text>}
    </div>
  );
}
