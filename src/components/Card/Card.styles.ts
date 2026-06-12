import styled from "styled-components";

interface StyledCardProps {
  $elevated: boolean;
  $clickable: boolean;
}

export const StyledCard = styled.div<StyledCardProps>`
  position: relative;
  background-color: ${({ theme, $elevated }) =>
    $elevated
      ? theme.colors.surfaceContainerHigh
      : theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.card}px;
  padding: ${({ theme }) => theme.spacing.space4}px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
`;

export const AccentRail = styled.div<{ $accent: string }>`
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 3px;
  border-radius: 999px;
  background: ${({ $accent }) => $accent};
`;
