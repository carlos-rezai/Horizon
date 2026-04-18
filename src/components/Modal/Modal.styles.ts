import styled from "styled-components";

export const StyledOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: ${({ theme }) => theme.colors.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

export const StyledDialog = styled.div`
  background-color: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg}px;
  padding: ${({ theme }) => theme.spacing.space6}px;
  min-width: ${({ theme }) => theme.layout.modalWidth}px;
  max-width: 90vw;
`;
