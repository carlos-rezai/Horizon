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
}

export default function Snackbar({
  message,
  variant,
  onClose,
  action,
}: SnackbarProps) {
  return (
    <StyledSnackbar $variant={variant} role="status">
      <StyledMessage>{message}</StyledMessage>
      {action && (
        <StyledActionButton onClick={action.onClick}>
          {action.label}
        </StyledActionButton>
      )}
      <StyledCloseButton onClick={onClose} aria-label="close">
        ✕
      </StyledCloseButton>
    </StyledSnackbar>
  );
}
