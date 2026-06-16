import styled from "styled-components";

export const StyledBrandMark = styled.svg`
  flex-shrink: 0;

  .ring {
    stroke: ${({ theme }) => theme.colors.outlineVariant};
  }

  .arc {
    stroke: ${({ theme }) => theme.colors.primary};
  }

  .sun {
    fill: ${({ theme }) => theme.colors.primary};
  }
`;
