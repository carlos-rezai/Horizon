import styled from "styled-components";
import { Link } from "react-router-dom";

export const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledBackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-weight: 500;
  text-decoration: none;
  width: fit-content;

  &:hover {
    color: ${({ theme }) => theme.colors.onSurface};
  }
`;

export const StyledErrorText = styled.p`
  color: ${({ theme }) => theme.colors.error};
`;
