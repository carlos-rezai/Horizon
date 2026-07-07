import { useState } from "react";
import StackedSnackbar from "../../../components/SnackbarProvider/StackedSnackbar";
import { useUpdateStatus } from "../useUpdateStatus";

export default function UpdateBanner() {
  const { state, install, download } = useUpdateStatus();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  if (state === "available") {
    return (
      <StackedSnackbar
        message="A new version of Horizon is available."
        variant="info"
        onClose={() => setDismissed(true)}
        action={{ label: "Download", onClick: download }}
      />
    );
  }

  if (state === "ready") {
    return (
      <StackedSnackbar
        message="A new version of Horizon is ready."
        variant="info"
        onClose={() => setDismissed(true)}
        action={{ label: "Restart to update", onClick: install }}
      />
    );
  }

  return null;
}
