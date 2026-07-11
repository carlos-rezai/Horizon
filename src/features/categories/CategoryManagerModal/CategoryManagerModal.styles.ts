import styled from "styled-components";

// ── Manage-categories layout ──────────────────────────────────────────────
// Restyle of the manager per docs/handoff/categories-redesign: scannable rows
// with a popover swatch, click-to-edit rename, hover-revealed icon actions, and
// a dashed "Add category" affordance. Behaviour is unchanged — this file only
// carries the Meridian-token styling.

export const Sections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space5}px;
`;

export const Section = styled.section``;

export const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space3}px;
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
  padding: 0 ${({ theme }) => theme.spacing.space1}px;
`;

export const SectionLabel = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.label.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: ${({ theme }) => theme.typography.scale.label.textTransform};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const SectionHint = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;

export const RowList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

// Actions defined before Row so Row's hover/focus rules can target it.
export const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space1}px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.14s ease;
`;

export const Row = styled.div<{ $hidden: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: transparent;
  opacity: ${({ $hidden }) => ($hidden ? 0.55 : 1)};
  transition:
    background 0.12s ease,
    opacity 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }

  &:hover ${Actions}, &:focus-within ${Actions} {
    opacity: 1;
  }
`;

export const RowMain = styled.div`
  flex: 1;
  min-width: 0;
`;

export const DisplayWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
`;

export const RowName = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  line-height: ${({ theme }) => theme.typography.scale.bodyMd.lineHeight};
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  color: ${({ theme }) => theme.colors.onSurface};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const EditWrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const NameInput = styled.input`
  min-width: 140px;
  padding: 5px 9px;
  background: ${({ theme }) => theme.colors.surfaceContainerLowest};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.sm}px;
  color: ${({ theme }) => theme.colors.onSurface};
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 13.5px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  outline: none;
`;

export const EditActionButton = styled.button<{ $tone: "pos" | "neutral" }>`
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: ${({ $tone, theme }) =>
    $tone === "pos" ? theme.colors.secondary : theme.colors.onSurfaceDim};
  background: ${({ $tone, theme }) =>
    $tone === "pos" ? theme.colors.secondaryContainer : "transparent"};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const ActionButton = styled.button<{ $danger?: boolean }>`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: transparent;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease;

  &:hover {
    background: ${({ $danger, theme }) =>
      $danger
        ? theme.colors.errorContainer
        : theme.colors.surfaceContainerHighest};
    color: ${({ $danger, theme }) =>
      $danger ? theme.colors.error : theme.colors.onSurface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

// ── Swatch popover ─────────────────────────────────────────────────────────

export const SwatchAnchor = styled.div`
  position: relative;
  flex-shrink: 0;
`;

export const SwatchDot = styled.button<{ $color: string; $open: boolean }>`
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ $color }) => $color};
  border: 2px solid ${({ theme }) => theme.colors.surfaceContainerHighest};
  box-shadow: 0 0 0 1.5px
    ${({ $open, theme }) =>
      $open ? theme.colors.primary : theme.colors.outlineVariant};
  cursor: pointer;
  transition: box-shadow 0.12s ease;
`;

export const Popover = styled.div`
  position: absolute;
  top: 30px;
  left: 0;
  z-index: 20;
  padding: 10px;
  background: ${({ theme }) => theme.colors.surfaceContainerHighest};
  border: 1px solid ${({ theme }) => theme.colors.outline};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  box-shadow: 0 14px 30px -8px rgba(0, 0, 0, 0.55);
`;

// ── Add-category affordance ────────────────────────────────────────────────

export const AddButton = styled.button`
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.space1}px;
  padding: 11px 12px;
  border: 1px dashed ${({ theme }) => theme.colors.outline};
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: transparent;
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 13.5px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  cursor: pointer;
  transition:
    background 0.14s ease,
    border-color 0.14s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primaryContainer};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const AddForm = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space1}px;
  padding: ${({ theme }) => theme.spacing.space3}px;
  border: 1px solid ${({ theme }) => theme.colors.accentLine};
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme }) => theme.colors.surface};
`;

export const AddFormRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const AddInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  background: ${({ theme }) => theme.colors.surfaceContainerLowest};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.sm}px;
  color: ${({ theme }) => theme.colors.onSurface};
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 13.5px;
  outline: none;

  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const ErrorText = styled.p`
  margin: ${({ theme }) => theme.spacing.space2}px 0 0;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.error};
`;

// ── Reassign-before-delete prompt ──────────────────────────────────────────

export const WarnBanner = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: 12px 14px;
  margin-bottom: ${({ theme }) => theme.spacing.space4}px;
  background: ${({ theme }) => theme.colors.errorContainer};
  border: 1px solid ${({ theme }) => `${theme.colors.error}4d`};
  border-radius: ${({ theme }) => theme.radius.md}px;
`;

export const WarnIcon = styled.span`
  display: flex;
  flex-shrink: 0;
  margin-top: 1px;
  color: ${({ theme }) => theme.colors.error};
`;

export const WarnText = styled.p`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};

  strong {
    font-weight: ${({ theme }) => theme.typography.weights.medium};
    color: ${({ theme }) => theme.colors.onSurface};
  }
`;

export const ReassignLabel = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: ${({ theme }) => theme.typography.scale.label.textTransform};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;
