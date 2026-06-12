import styled from "styled-components";

type Align = "left" | "right";

export const StyledStatBlock = styled.div<{ $align: Align }>`
  text-align: ${({ $align }) => $align};
`;

export const StyledLabel = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.label.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-bottom: 9px;
`;

export const StyledValue = styled.div<{ $align: Align }>`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing.space2}px;
  justify-content: ${({ $align }) =>
    $align === "right" ? "flex-end" : "flex-start"};
`;

export const StyledHint = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: ${({ theme }) => theme.typography.scale.body.lineHeight};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-top: ${({ theme }) => theme.spacing.space2}px;
`;
