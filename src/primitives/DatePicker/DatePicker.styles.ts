import styled from "styled-components";
import { focusRing } from "../focusRing/focusRing";

export const Wrapper = styled.div`
  position: relative;
  display: block;

  .react-datepicker-wrapper,
  .react-datepicker__input-container {
    display: block;
    width: 100%;
  }

  .react-datepicker {
    font-family: ${({ theme }) => theme.typography.fontFamily.ui};
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
    border-radius: ${({ theme }) => theme.radius.button}px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  .react-datepicker__header {
    background: ${({ theme }) => theme.colors.surfaceContainerLowest};
    border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  }

  .react-datepicker__current-month,
  .react-datepicker__day-name {
    color: ${({ theme }) => theme.colors.onSurface};
  }

  .react-datepicker__day {
    color: ${({ theme }) => theme.colors.onSurface};
    border-radius: ${({ theme }) => theme.radius.button}px;

    &:hover {
      background: ${({ theme }) => theme.colors.surfaceContainerLow};
    }
  }

  .react-datepicker__day--selected {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.onPrimary};

    &:hover {
      background: ${({ theme }) => theme.colors.primary};
    }
  }

  /* Today and the keyboard-selected day read in the gold tokens, not the
     library's pale blue. Each rule names its colour first, written with the
     plain prop accessor. */
  .react-datepicker__day--today {
    color: ${(p) => p.theme.colors.primary};
    font-weight: ${({ theme }) => theme.typography.weights.semibold};
  }

  .react-datepicker__day--keyboard-selected {
    background: ${(p) => p.theme.colors.primaryContainer};
    box-shadow: inset 0 0 0 1px ${(p) => p.theme.colors.primary};
    color: ${({ theme }) => theme.colors.onSurface};

    &:hover {
      background: ${({ theme }) => theme.colors.primaryContainer};
    }
  }

  .react-datepicker__day--selected.react-datepicker__day--keyboard-selected,
  .react-datepicker__day--selected.react-datepicker__day--today {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.onPrimary};
  }

  .react-datepicker__day--disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* The month navigation buttons themselves, so the arrows show above the
     header and take the shared focus ring. */
  .react-datepicker__navigation {
    top: ${(p) => p.theme.spacing.space1}px;
    z-index: 2;
    width: ${({ theme }) => theme.sizing.control.sm}px;
    height: ${({ theme }) => theme.sizing.control.sm}px;
    border-radius: ${({ theme }) => theme.radius.button}px;

    &:hover {
      background: ${({ theme }) => theme.colors.surfaceContainerLow};
    }

    ${focusRing}
  }

  .react-datepicker__navigation-icon::before {
    border-color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }

  .react-datepicker__navigation:hover
    .react-datepicker__navigation-icon::before {
    border-color: ${({ theme }) => theme.colors.onSurface};
  }
`;
