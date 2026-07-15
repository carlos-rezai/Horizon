import styled from "styled-components";

export const StyledBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space5}px;
`;

export const StyledFieldLabel = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledModeToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

/**
 * Holds both modes' intro content (hint + optional Milestone fields) stacked in
 * a single grid cell. The cell sizes to the taller mode, so switching between
 * Milestone and Manual never changes the dialog's height — no reserved pixel
 * magic number, and it stays correct if the copy changes.
 */
export const StyledModeSection = styled.div`
  display: grid;
`;

/** One mode's intro, occupying the shared grid cell. The inactive mode keeps its
 *  layout box (so the taller mode's height is reserved) but is not painted. */
export const StyledModePane = styled.div<{ $active: boolean }>`
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space5}px;
  visibility: ${({ $active }) => ($active ? "visible" : "hidden")};
`;

export const StyledMilestoneFields = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledHint = styled.p`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin: 0;
`;

export const StyledAccountRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledAccountRow = styled.div`
  display: grid;
  grid-template-columns: 12px 1fr 140px;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledColorDot = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`;

export const StyledAccountName = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  color: ${({ theme }) => theme.colors.onSurface};
`;
