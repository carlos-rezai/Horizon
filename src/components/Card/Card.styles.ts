import styled from "styled-components";

interface StyledCardProps {
  $elevated: boolean;
}

export const StyledCard = styled.div<StyledCardProps>`
  background-color: ${({ theme, $elevated }) =>
    $elevated
      ? theme.colors.surfaceContainerHigh
      : theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.card}px;
  padding: ${({ theme }) => theme.spacing.space4}px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
`;
