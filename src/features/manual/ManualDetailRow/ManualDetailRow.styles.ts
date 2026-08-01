import styled from "styled-components";

export const StyledRow = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.lineFaint};
`;

export const StyledToggle = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  width: 100%;
  padding: 13px 4px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
`;

// The year-accordion chevron, to the degree: right when shut, a quarter turn
// down when open, on the shared swap curve. Same interaction language, so a
// reader who has met the Outlook and History rows already knows this one.
export const StyledChevron = styled.span<{ $open: boolean }>`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: ${({ theme, $open }) =>
    $open ? theme.colors.primary : theme.colors.onSurfaceDim};
  transform: ${({ $open }) => ($open ? "rotate(90deg)" : "none")};
  transition: transform ${({ theme }) => theme.transitions.swap};
`;

export const StyledHeading = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: 13.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

// Indented to clear the chevron, so an expanded body reads as belonging to its
// heading rather than as a new top-level paragraph.
export const StyledBody = styled.div`
  padding: 0 4px 16px 29px;
`;

export const StyledProse = styled.p`
  max-width: 620px;
  margin: 0;
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 13px;
  line-height: ${({ theme }) => theme.typography.lineHeights.relaxed};
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

// A real definition list: terms in one column, definitions in the next. The
// grid is what makes `dt`/`dd` read side by side without abandoning the markup
// that says what they are.
export const StyledTerms = styled.dl`
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: ${({ theme }) => theme.spacing.space3}px;
  max-width: 620px;
  margin: ${({ theme }) => theme.spacing.space3}px 0 0;
`;

export const StyledTerm = styled.dt`
  padding-top: 1px;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 10.5px;
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledDefinition = styled.dd`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 12.5px;
  line-height: 1.55;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;
