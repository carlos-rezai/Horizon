import styled from "styled-components";

export const StyledSparkline = styled.svg<{ $stretch: boolean }>`
  display: block;
  overflow: ${({ $stretch }) => ($stretch ? "hidden" : "visible")};
`;
