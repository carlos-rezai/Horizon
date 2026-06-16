import styled from "styled-components";

export const Wrapper = styled.div`
  position: relative;
  display: block;

  .react-datepicker-wrapper,
  .react-datepicker__input-container {
    display: block;
    width: 100%;
  }

  .react-datepicker {
    font-family: ${({ theme }) => theme.typography.fontFamily};
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

  .react-datepicker__day--disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .react-datepicker__navigation-icon::before {
    border-color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }
`;

export const StyledCalendarIcon = styled.span`
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.spacing.space3}px;
  transform: translateY(-50%);
  display: grid;
  place-items: center;
  pointer-events: none;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledDateInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.space2}px 32px
    ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
  color: ${({ theme }) => theme.colors.onSurface};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.button}px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  line-height: ${({ theme }) => theme.typography.lineHeights.normal};
  cursor: pointer;

  &::placeholder {
    color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }

  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary};
  }
`;
