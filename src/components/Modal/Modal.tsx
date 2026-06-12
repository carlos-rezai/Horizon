import React from "react";
import {
  StyledOverlay,
  StyledDialog,
  StyledHeader,
  StyledTitle,
  StyledClose,
  StyledBody,
  StyledFooter,
} from "./Modal.styles";

interface ModalProps {
  onClose: () => void;
  title?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export default function Modal({
  onClose,
  title,
  footer,
  children,
}: ModalProps) {
  return (
    <StyledOverlay data-testid="modal-overlay" onClick={onClose}>
      <StyledDialog
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <StyledHeader>
            <StyledTitle>{title}</StyledTitle>
            <StyledClose
              type="button"
              data-testid="modal-close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </StyledClose>
          </StyledHeader>
        )}
        <StyledBody>{children}</StyledBody>
        {footer && <StyledFooter>{footer}</StyledFooter>}
      </StyledDialog>
    </StyledOverlay>
  );
}
