import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space6}px;
  padding: ${({ theme }) => theme.spacing.space8}px;
  max-width: ${({ theme }) => theme.layout.contentMaxWidth}px;
`;

export const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;
