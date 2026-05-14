import { useEffect, useState } from "react";
import { VersionText } from "./AppVersion.styles";

export default function AppVersion() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    void window.horizon?.updates.getAppVersion().then(setVersion);
  }, []);

  if (!version) return null;
  return <VersionText>{version}</VersionText>;
}
