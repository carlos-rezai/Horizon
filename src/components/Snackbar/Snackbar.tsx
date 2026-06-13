import {
  StyledSnackbar,
  StyledMessage,
  StyledActionButton,
  StyledCloseButton,
} from "./Snackbar.styles";

type Variant = "info" | "success" | "warning" | "error";

interface SnackbarAction {
  label: string;
  onClick: () => void;
}

interface SnackbarProps {
  message: string;
  variant: Variant;
  onClose: () => void;
  action?: SnackbarAction;
  positioned?: boolean;
}

export default function Snackbar({
  message,
  variant,
  onClose,
  action,
  positioned = true,
}: SnackbarProps) {
  return (
    <StyledSnackbar
      $variant={variant}
      $positioned={positioned}
      role="status"
      data-variant={variant}
    >
      <StyledMessage>{message}</StyledMessage>
      {action && (
        <StyledActionButton
          onClick={() => {
            action.onClick();
            onClose();
          }}
        >
          {action.label}
        </StyledActionButton>
      )}
      <StyledCloseButton onClick={onClose} aria-label="close">
        ✕
      </StyledCloseButton>
    </StyledSnackbar>
  );
}
