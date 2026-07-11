import { useState } from "react";
import { RefreshCw, Sun, Filter, ShieldCheck } from "lucide-react";
import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import SettingRow from "../../../components/SettingRow/SettingRow";
import Badge from "../../../primitives/Badge/Badge";
import Button from "../../../primitives/Button/Button";
import CategoryManagerModal from "../../categories/CategoryManagerModal/CategoryManagerModal";
import AutoUpdateToggle from "../AutoUpdateToggle/AutoUpdateToggle";

export default function PreferencesCard() {
  const [isManaging, setIsManaging] = useState(false);

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
        icon={<Filter size={18} />}
        title="Categories"
        desc="Recolor, rename, hide or add spending categories"
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsManaging(true)}
        >
          Manage
        </Button>
      </SettingRow>
      <SettingRow
        icon={<ShieldCheck size={18} />}
        title="Privacy"
        desc="No cloud · no telemetry · no account"
        last
      >
        <Badge tone="pos">Local</Badge>
      </SettingRow>
      {isManaging && (
        <CategoryManagerModal onClose={() => setIsManaging(false)} />
      )}
    </Card>
  );
}
