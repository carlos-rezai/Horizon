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

  .react-datepicker__day--disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .react-datepicker__navigation-icon::before {
    border-color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }
`;
