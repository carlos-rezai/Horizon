import { useEffect, useState } from "react";
import { VersionList, VersionText } from "./AppVersion.styles";

export default function AppVersion() {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    void window.horizon?.updates.getAppVersion().then(setAppVersion);
  }, []);

  if (!appVersion) return null;

  const electronVersion = window.horizon?.electronVersion;

  return (
    <VersionList>
      <VersionText>Horizon {appVersion}</VersionText>
      {electronVersion && <VersionText>Electron {electronVersion}</VersionText>}
    </VersionList>
  );
}
