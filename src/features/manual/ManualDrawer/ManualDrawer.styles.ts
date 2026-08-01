import styled, { css, keyframes } from "styled-components";
import { MANUAL_TRANSITION_MS } from "../useManualDrawer";

// The panel's own curve: a fast-out settle, distinct from the token swap easing
// because this is a 320ms travelling surface, not a 180ms cross-fade.
const PANEL_EASING = "cubic-bezier(0.2, 0.7, 0.3, 1)";

const slideIn = keyframes`
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
`;

// Above the modal overlay's z-index of 100: the manual can be opened while a
// dialog is showing, and it must not arrive underneath it.
export const StyledOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  justify-content: flex-end;
`;

// A sibling of the panel rather than its parent, so a click inside the panel
// never reaches the dismiss handler.
export const StyledBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background-color: ${({ theme }) => theme.colors.overlay};
`;

// Motion is emitted only when it is actually wanted: a reduced-motion render
// carries no animation and no transition rule at all, rather than a
// zero-length one.
export const StyledPanel = styled.div<{ $open: boolean; $slide: boolean }>`
  position: relative;
  width: min(980px, 94vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
  border-left: 1px solid ${({ theme }) => theme.colors.outline};
  box-shadow: -24px 0 60px -20px rgba(0, 0, 0, 0.6);
  ${({ $slide, $open }) => {
    if (!$slide) return null;
    return $open
      ? css`
          transform: translateX(0);
          animation: ${slideIn} ${MANUAL_TRANSITION_MS}ms ${PANEL_EASING};
        `
      : css`
          transform: translateX(100%);
          transition: transform ${MANUAL_TRANSITION_MS}ms ${PANEL_EASING};
        `;
  }}
`;

export const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: ${({ theme }) => theme.spacing.space5}px
    ${({ theme }) => theme.spacing.space7}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledHeaderIcon = styled.span`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme }) => theme.colors.primaryContainer};
  color: ${({ theme }) => theme.colors.primary};
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

export const StyledSubtitle = styled.p`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledClose = styled.button`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: transparent;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    color: ${({ theme }) => theme.colors.onSurface};
  }
`;

// Rail and pane scroll independently: a reader deep in Settings must still see
// the whole table of contents, so the outer row hides its own overflow and
// hands scrolling to the two columns.
export const StyledColumns = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

export const StyledRail = styled.nav`
  width: 216px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.space5}px
    ${({ theme }) => theme.spacing.space3}px;
  border-right: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledGroup = styled.div`
  margin-bottom: 18px;
`;

export const StyledGroupLabel = styled.div`
  padding: 0 10px 8px;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;

// The active entry is carried by weight, tone and a filled ground at once —
// one signal alone reads as a hover on a dark surface.
export const StyledRailEntry = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surfaceContainerHigh : "transparent"};
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.onSurface : theme.colors.onSurfaceVariant};
  text-align: left;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.swap};

  & > svg {
    flex-shrink: 0;
    color: ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.onSurfaceDim};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;

// The pane owns the scroll, not the page: the screen behind the backdrop must
// stay exactly where the reader left it.
export const StyledPane = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 ${({ theme }) => theme.spacing.space8}px
    ${({ theme }) => theme.spacing.space10}px;
`;
