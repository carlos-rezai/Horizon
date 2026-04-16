import React from "react";
import { StyledOverlay, StyledDialog } from "./Modal.styles";

interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ onClose, children }: ModalProps) {
  return (
    <StyledOverlay data-testid="modal-overlay" onClick={onClose}>
      <StyledDialog
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </StyledDialog>
    </StyledOverlay>
  );
}
