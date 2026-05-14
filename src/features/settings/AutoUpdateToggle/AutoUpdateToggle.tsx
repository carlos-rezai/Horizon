import { useEffect, useState } from "react";
import Toggle from "../../../primitives/Toggle/Toggle";
import { Label, Row } from "./AutoUpdateToggle.styles";

export default function AutoUpdateToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    void window.horizon?.updates.getAutoDownload().then(setEnabled);
  }, []);

  if (enabled === null) return null;

  function handleChange(value: boolean): void {
    setEnabled(value);
    void window.horizon?.updates.setAutoDownload(value);
  }

  return (
    <Row>
      <Label>Automatically download updates</Label>
      <Toggle checked={enabled} onChange={handleChange} />
    </Row>
  );
}
