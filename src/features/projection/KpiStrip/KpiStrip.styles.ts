import styled from "styled-components";

export const StyledStrip = styled.div`
  display: flex;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.card}px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
`;

export const StyledTile = styled.div<{ $accent?: boolean }>`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding: 18px 20px;
  border-right: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  background-color: ${({ theme, $accent }) =>
    $accent ? theme.colors.primaryContainer : "transparent"};

  &:last-child {
    border-right: none;
  }
`;

export const StyledTileHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
`;

export const StyledLabel = styled.span<{ $accent?: boolean }>`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 10.5px;
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: ${({ theme, $accent }) =>
    $accent ? theme.colors.primary : theme.colors.onSurfaceDim};
`;

// The numerals render at this size and the app's normal line-height, so the
// value slot's real line-box is VALUE_FONT_SIZE * lineHeights.normal. Reserving
// that height explicitly — here, so the skeleton reuses the exact same rule —
// keeps the slot the same height before and after the numbers land, which is
// what removes the Dashboard's cold-load layout shift (issue #208).
export const VALUE_FONT_SIZE = 30;

export const StyledValue = styled.div`
  margin-top: 12px;
  height: ${({ theme }) =>
    VALUE_FONT_SIZE * theme.typography.lineHeights.normal}px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${VALUE_FONT_SIZE}px;
  line-height: ${({ theme }) => theme.typography.lineHeights.normal};
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledSpark = styled.div`
  margin-top: 16px;
`;

export const StyledPayoffValue = styled.div`
  margin-top: 12px;
  display: flex;
  align-items: baseline;
  gap: 5px;
`;

export const StyledPayoffNum = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledPayoffUnit = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.body.fontSize};
  color: ${({ theme }) => theme.colors.onSurfaceVariant};

  &:not(:last-child) {
    margin-right: 4px;
  }
`;

export const StyledPayoffHint = styled.div`
  margin-top: 6px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;
