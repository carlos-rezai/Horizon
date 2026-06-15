import styled from "styled-components";

export const StyledEmpty = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  padding: ${({ theme }) => theme.spacing.space4}px 0;
`;
