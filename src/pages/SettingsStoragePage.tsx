import Heading from "../primitives/Heading/Heading";
import StorageStatus from "../features/settings/StorageStatus/StorageStatus";
import { Container, Header } from "./SettingsStoragePage.styles";

export default function SettingsStoragePage() {
  return (
    <Container>
      <Header>
        <Heading level={1}>Storage</Heading>
      </Header>
      <StorageStatus />
    </Container>
  );
}
