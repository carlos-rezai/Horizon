import { useEffect, useState } from "react";
import StackedSnackbar from "../../../components/SnackbarProvider/StackedSnackbar";
import { useSnackbar } from "../../../components/SnackbarProvider/useSnackbar";
import { useAlert } from "../../../components/AlertProvider/useAlert";
import { useUpdateStatus } from "../useUpdateStatus";

export default function UpdateBanner() {
  const { state, message, install, download } = useUpdateStatus();
  const { notify } = useSnackbar();
  const { alert } = useAlert();
  const [dismissed, setDismissed] = useState(false);

  // Manual "Check for Updates" outcomes are transient (snackbar) or blocking
  // (alert modal) rather than persistent banners. They fire once per state
  // transition — each manual run re-enters "checking" first, so a repeat check
  // with the same result still re-notifies.
  useEffect(() => {
    if (state === "checking") {
      notify("Checking for updates…", "info");
    } else if (state === "uptodate") {
      notify(message ?? "Horizon is up to date.", "success");
    } else if (state === "error") {
      alert({
        title: "Check for Updates",
        message: "Horizon could not check for updates.",
        detail: message,
        tone: "error",
      });
    }
  }, [state, message, notify, alert]);

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
