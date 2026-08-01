import styled from "styled-components";

// A hairline per topic, so a reader scrolling the pane can feel where one
// topic ends and the next begins without reading the heading.
export const StyledSection = styled.section`
  padding: 34px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};

  &:last-child {
    border-bottom: none;
  }
`;

export const StyledSectionHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  margin-bottom: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledTopicIcon = styled.span`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme }) => theme.colors.primaryContainer};
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledTopicTitle = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.typography.scale.h1.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h1.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h1.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.h1.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.h1.letterSpacing};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledBlurb = styled.p`
  max-width: 620px;
  margin: 0 0 18px;
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 14.5px;
  line-height: ${({ theme }) => theme.typography.lineHeights.relaxed};
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledDetails = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space4}px;
`;
