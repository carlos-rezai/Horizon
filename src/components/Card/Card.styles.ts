import styled from "styled-components";

interface StyledCardProps {
  $elevated: boolean;
}

export const StyledCard = styled.div<StyledCardProps>`
  background-color: ${({ theme, $elevated }) =>
    $elevated ? theme.colors.bgElevated : theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: ${({ theme }) => theme.spacing.space4}px;
`;
