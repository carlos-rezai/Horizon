import Modal from "../Modal/Modal";
import Button from "../../primitives/Button/Button";
import { StyledMessage, StyledDetail } from "./ConfirmModal.styles";

export type ConfirmTone = "default" | "danger";

interface ConfirmModalProps {
  title: string;
  message: string;
  /** Optional secondary line — e.g. the path being overwritten. */
  detail?: string;
  /** `danger` styles the confirm button and accent for destructive actions. */
  tone?: ConfirmTone;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A dumb, tone-aware confirm/cancel modal built on the shared `Modal`. It is the
 * in-app replacement for the native warning boxes the destructive menu actions
 * (Start Fresh, Restore-overwrite) used to raise. Dismissing via the overlay or
 * the header close is treated as a cancel, so a destructive action never
 * proceeds without an explicit confirm click.
 */
export default function ConfirmModal({
  title,
  message,
  detail,
  tone = "default",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <StyledMessage $tone={tone} data-tone={tone}>
        {message}
      </StyledMessage>
      {detail && <StyledDetail>{detail}</StyledDetail>}
    </Modal>
  );
}
