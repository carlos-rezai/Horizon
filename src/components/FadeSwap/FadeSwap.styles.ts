import styled, { css, keyframes } from "styled-components";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

// `min-width: 0` so the wrapper never widens a grid column it sits inside.
// The animation is emitted only when the fade is actually wanted, so a
// suppressed render carries no animation rule at all rather than a
// zero-length one.
export const StyledFade = styled.div<{ $animate: boolean }>`
  min-width: 0;
  ${({ $animate, theme }) =>
    !$animate
      ? null
      : css`
          animation: ${fadeIn} ${theme.transitions.swapDuration}
            ${theme.transitions.easing};
        `}
`;
