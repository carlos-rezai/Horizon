import PageHeader from "../../components/PageHeader/PageHeader";
import Card from "../../components/Card/Card";
import SectionHead from "../../components/SectionHead/SectionHead";
import StorageCard from "../../features/settings/StorageCard/StorageCard";
import AutoUpdateToggle from "../../features/settings/AutoUpdateToggle/AutoUpdateToggle";
import AppVersion from "../../features/settings/AppVersion/AppVersion";
import {
  Container,
  FullWidth,
  Grid,
  Preferences,
} from "./SettingsStoragePage.styles";

export default function SettingsStoragePage() {
  return (
    <Container>
      <PageHeader
        overline="System"
        title="Settings"
        subtitle="Offline-first · all data lives locally on this device"
      />
      <Grid>
        <StorageCard />
        <Card>
          <SectionHead label="Application" title="Preferences" />
          <Preferences>
            <AutoUpdateToggle />
          </Preferences>
        </Card>
        <FullWidth>
          <Card>
            <SectionHead label="About" title="Horizon" />
            <AppVersion />
          </Card>
        </FullWidth>
      </Grid>
    </Container>
  );
}
