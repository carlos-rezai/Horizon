import Heading from "../primitives/Heading/Heading";
import Spinner from "../primitives/Spinner/Spinner";
import Text from "../primitives/Text/Text";
import { useStorageStatus } from "../features/settings/useStorageStatus";

export default function SettingsStoragePage() {
  const { status, isLoading, error } = useStorageStatus();

  if (isLoading) return <Spinner />;
  if (error) return <Text>{`Error: ${error}`}</Text>;
  if (!status) return null;

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
    </div>
  );
}
