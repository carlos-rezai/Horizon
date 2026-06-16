import { useEffect, useState } from "react";
import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import BrandMark from "../../../components/BrandMark/BrandMark";
import Button from "../../../primitives/Button/Button";
import { useSnackbar } from "../../../components/SnackbarProvider/useSnackbar";
import { useUpdateStatus } from "../../updates/useUpdateStatus";
import {
  Layout,
  Identity,
  IdentityText,
  AppName,
  AppDesc,
  Meta,
  Version,
  VersionLabel,
  VersionValue,
} from "./AboutCard.styles";

export default function AboutCard() {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const { state, download, install } = useUpdateStatus();
  const { notify } = useSnackbar();

  useEffect(() => {
    void window.horizon?.updates.getAppVersion().then(setAppVersion);
  }, []);

  function handleCheck(): void {
    if (state === "available") {
      notify("A new version of Horizon is available.", {
        variant: "info",
        action: { label: "Download", onClick: download },
      });
    } else if (state === "ready") {
      notify("A new version of Horizon is ready.", {
        variant: "info",
        action: { label: "Restart to update", onClick: install },
      });
    } else {
      notify(
        appVersion
          ? `You're on the latest version (${appVersion}).`
          : "You're on the latest version.",
        { variant: "info" }
      );
    }
  }

  return (
    <Card>
      <SectionHead label="About" title="Horizon" />
      <Layout>
        <Identity>
          <BrandMark size={40} />
          <IdentityText>
            <AppName>Personal Finance Tracker for Long-Term Thinkers</AppName>
            <AppDesc>Electron · React · SQLite · offline-first</AppDesc>
          </IdentityText>
        </Identity>
        <Meta>
          <Version>
            <VersionLabel>Version</VersionLabel>
            <VersionValue>{appVersion ?? "—"}</VersionValue>
          </Version>
          <Button
            variant="secondary"
            size="sm"
            icon="RefreshCw"
            onClick={handleCheck}
          >
            Check for updates
          </Button>
        </Meta>
      </Layout>
    </Card>
  );
}
