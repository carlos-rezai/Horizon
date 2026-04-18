import styled from "styled-components";

interface StyledCardProps {
  $elevated: boolean;
}

export const StyledCard = styled.div<StyledCardProps>`
  background-color: ${({ theme, $elevated }) =>
    $elevated ? theme.colors.bgElevated : theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  padding: ${({ theme }) => theme.spacing.space4}px;
`;
