import { useState } from "react";
import Snackbar from "../../../components/Snackbar/Snackbar";
import { useUpdateStatus } from "../useUpdateStatus";

export default function UpdateBanner() {
  const { state, install } = useUpdateStatus();
  const [dismissed, setDismissed] = useState(false);

  if (state !== "ready" || dismissed) {
    return null;
  }

  return (
    <Snackbar
      message="A new version of Horizon is ready."
      variant="info"
      onClose={() => setDismissed(true)}
      action={{ label: "Restart to update", onClick: install }}
    />
  );
}
