// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import InsufficientFundsWarnings from "./InsufficientFundsWarnings";

interface InsufficientFundsWarning {
  ccAccountId: string;
  fundingAccountId: string;
  settlementAmount: number;
  settlementMonth: string;
  settlementDay: number;
}

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const oneWarning: InsufficientFundsWarning[] = [
  {
    ccAccountId: "cc1",
    fundingAccountId: "giro1",
    settlementAmount: 50000,
    settlementMonth: "2026-06",
    settlementDay: 15,
  },
];

const twoWarnings: InsufficientFundsWarning[] = [
  ...oneWarning,
  {
    ccAccountId: "cc2",
    fundingAccountId: "giro1",
    settlementAmount: 30000,
    settlementMonth: "2026-06",
    settlementDay: 15,
  },
];

describe("InsufficientFundsWarnings", () => {
  it("renders nothing when warnings array is empty", () => {
    const { container } = renderWithTheme(
      <InsufficientFundsWarnings warnings={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders one error-variant Snackbar per warning", () => {
    renderWithTheme(<InsufficientFundsWarnings warnings={twoWarnings} />);

    // role="status" is the Snackbar's ARIA role; two warnings → two snackbars
    expect(screen.getAllByRole("status")).toHaveLength(2);
  });

  it("each Snackbar has a close button", () => {
    renderWithTheme(<InsufficientFundsWarnings warnings={oneWarning} />);

    expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
  });

  it("clicking the close button removes that Snackbar — warning is not auto-dismissed", () => {
    renderWithTheme(<InsufficientFundsWarnings warnings={oneWarning} />);

    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /close/i }));
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
