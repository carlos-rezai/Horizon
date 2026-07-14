import Modal from "../Modal/Modal";
import Button from "../../primitives/Button/Button";
import { StyledMessage, StyledDetail } from "./AlertModal.styles";

export type AlertTone = "info" | "success" | "warning" | "error";

interface AlertModalProps {
  title: string;
  message: string;
  /** Optional secondary line — e.g. a path or an error string worth reading. */
  detail?: string;
  /** Drives the accent color; mirrors the Snackbar variant palette. */
  tone?: AlertTone;
  /** Label for the single acknowledge button. */
  okLabel?: string;
  onClose: () => void;
}

/**
 * A dumb, tone-aware acknowledge modal: a title, a message, an optional detail
 * line, and one OK button. Built on the shared `Modal`, it is the in-app
 * replacement for the native error/info message boxes the application menu used
 * to raise. It holds no state and knows nothing about menus or updates — a host
 * decides when to show it and what it says.
 */
export default function AlertModal({
  title,
  message,
  detail,
  tone = "info",
  okLabel = "OK",
  onClose,
}: AlertModalProps) {
  return (
    <Modal
      onClose={onClose}
      title={title}
      footer={
        <Button variant="primary" onClick={onClose}>
          {okLabel}
        </Button>
      }
    >
      <StyledMessage $tone={tone} data-tone={tone}>
        {message}
      </StyledMessage>
      {detail && <StyledDetail>{detail}</StyledDetail>}
    </Modal>
  );
}
