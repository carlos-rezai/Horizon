import { RefreshCw, Sun, ShieldCheck } from "lucide-react";
import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import SettingRow from "../../../components/SettingRow/SettingRow";
import Badge from "../../../primitives/Badge/Badge";
import AutoUpdateToggle from "../AutoUpdateToggle/AutoUpdateToggle";

export default function PreferencesCard() {
  return (
    <Card>
      <SectionHead label="Application" title="Preferences" />
      <SettingRow
        icon={<RefreshCw size={18} />}
        title="Automatic updates"
        desc="Via GitHub Releases · electron-updater"
      >
        <AutoUpdateToggle />
      </SettingRow>
      <SettingRow
        icon={<Sun size={18} />}
        title="Appearance"
        desc="Dark mode is Horizon's identity"
      >
        <Badge>Dark</Badge>
      </SettingRow>
      <SettingRow
        icon={<ShieldCheck size={18} />}
        title="Privacy"
        desc="No cloud · no telemetry · no account"
        last
      >
        <Badge tone="pos">Local</Badge>
      </SettingRow>
    </Card>
  );
}
