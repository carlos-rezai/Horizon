import PageHeader from "../../components/PageHeader/PageHeader";
import StorageCard from "../../features/settings/StorageCard/StorageCard";
import PreferencesCard from "../../features/settings/PreferencesCard/PreferencesCard";
import CategoriesCard from "../../features/settings/CategoriesCard/CategoriesCard";
import AboutCard from "../../features/settings/AboutCard/AboutCard";
import { Container, FullWidth, Grid } from "./SettingsStoragePage.styles";

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
        <PreferencesCard />
        <CategoriesCard />
        <FullWidth>
          <AboutCard />
        </FullWidth>
      </Grid>
    </Container>
  );
}
