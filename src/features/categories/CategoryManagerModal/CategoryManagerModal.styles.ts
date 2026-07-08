import styled from "styled-components";

export const Section = styled.section`
  & + & {
    margin-top: ${({ theme }) => theme.spacing.space6}px;
  }
`;

export const SectionLabel = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.space3}px;
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space3}px 0;

  & + & {
    border-top: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  }
`;

export const RowName = styled.span`
  flex: 0 0 auto;
  min-width: 120px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const Swatches = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const Swatch = styled.button<{ $color: string; $selected: boolean }>`
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background-color: ${({ $color }) => $color};
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.onSurface : "transparent"};
  outline: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  cursor: pointer;
`;

export const EmptyState = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.spacing.space3}px 0;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-style: italic;
`;
