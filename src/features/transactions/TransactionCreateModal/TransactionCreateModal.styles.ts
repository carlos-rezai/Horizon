import styled from "styled-components";

export const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
  min-width: ${({ theme }) => theme.layout.narrowModalWidth}px;
`;

export const StyledActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space3}px;
  justify-content: flex-end;
  padding-top: ${({ theme }) => theme.spacing.space2}px;
`;
