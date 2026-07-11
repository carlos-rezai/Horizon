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
  /**
   * Fixes the dialog to this pixel width so its size stays stable as content
   * changes (e.g. an inline form expanding). Still capped at 90vw for narrow
   * screens. Omit to size to content from the `modalWidth` minimum.
   */
  width?: number;
}

export default function Modal({
  onClose,
  title,
  footer,
  children,
  width,
}: ModalProps) {
  return (
    <StyledOverlay data-testid="modal-overlay" onClick={onClose}>
      <StyledDialog
        role="dialog"
        aria-modal="true"
        $width={width}
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
