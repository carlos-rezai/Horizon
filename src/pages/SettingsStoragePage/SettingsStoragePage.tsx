import Heading from "../../primitives/Heading/Heading";
import StorageStatus from "../../features/settings/StorageStatus/StorageStatus";
import AppVersion from "../../features/settings/AppVersion/AppVersion";
import AutoUpdateToggle from "../../features/settings/AutoUpdateToggle/AutoUpdateToggle";
import Card from "../../components/Card/Card";
import CardHeader from "../../components/CardHeader/CardHeader";
import {
  Container,
  Footer,
  Header,
  Section,
} from "./SettingsStoragePage.styles";

export default function SettingsStoragePage() {
  return (
    <Container>
      <Header>
        <Heading level={1}>Storage</Heading>
      </Header>
      <Section>
        <CardHeader text="Storage" />
        <Card>
          <StorageStatus />
        </Card>
      </Section>
      <Section>
        <CardHeader text="Updates" />
        <Card>
          <AutoUpdateToggle />
        </Card>
      </Section>
      <Footer>
        <AppVersion />
      </Footer>
    </Container>
  );
}
