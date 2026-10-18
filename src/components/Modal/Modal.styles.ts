import styled from "styled-components";

export const StyledOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: ${({ theme }) => theme.colors.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.space6}px;
  z-index: 100;
`;

export const StyledDialog = styled.div<{ $width?: number }>`
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
  border: 1px solid ${({ theme }) => theme.colors.outline};
  border-radius: ${({ theme }) => theme.radius.xl}px;
  ${({ $width, theme }) =>
    $width !== undefined
      ? `width: ${$width}px;`
      : `min-width: ${theme.layout.modalWidth}px;`}
  max-width: 90vw;
  max-height: 90vh;
  /* The body scrolls, never the dialog, so header and footer stay in view. */
  overflow: hidden;
  box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.6);

  /* Focused for containment only: rings belong to the controls inside. */
  &:focus,
  &:focus-visible {
    outline: none;
  }
`;

export const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 18px 22px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.scale.h2.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h2.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h2.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.h2.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.h2.letterSpacing};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledBody = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 22px;
`;

export const StyledFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: ${({ theme }) => theme.spacing.space4}px 22px;
  border-top: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;
