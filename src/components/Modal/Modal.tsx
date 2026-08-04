import React, { useRef } from "react";
import { useDialogKeyboard } from "../../hooks/useDialogKeyboard";
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
  const dialogRef = useRef<HTMLDivElement>(null);

  // Makes good on `aria-modal`: focus arrives here, Tab stays here, ESC closes,
  // and the keyboard goes back where it came from. Shared with the manual
  // drawer, which is the surface that first paid for it.
  useDialogKeyboard({ surfaceRef: dialogRef, onClose });

  return (
    <StyledOverlay data-testid="modal-overlay" onClick={onClose}>
      <StyledDialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
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
