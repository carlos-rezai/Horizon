// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import AccountStatStrip from "./AccountStatStrip";

function renderStrip(
  props: Partial<React.ComponentProps<typeof AccountStatStrip>> = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <AccountStatStrip
        openingBalance={props.openingBalance ?? 1274000}
        openingDate={props.openingDate ?? "2025-01-01"}
        recurringCount={props.recurringCount ?? 2}
        recurringNet={props.recurringNet ?? -150000}
      />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe("AccountStatStrip", () => {
  it("renders the four stat labels", () => {
    renderStrip();
    expect(screen.getByText(/opening balance/i)).toBeInTheDocument();
    expect(screen.getByText(/opening date/i)).toBeInTheDocument();
    expect(screen.getByText(/^recurring$/i)).toBeInTheDocument();
    expect(screen.getByText(/recurring net/i)).toBeInTheDocument();
  });

  it("formats the opening balance", () => {
    renderStrip({ openingBalance: 1274000 });
    // 1274000 cents → 12.740,00 €
    expect(screen.getByText(/12[.,]740/)).toBeInTheDocument();
  });

  it("shows the opening date as an ISO string", () => {
    renderStrip({ openingDate: "2025-01-01" });
    expect(screen.getByText("2025-01-01")).toBeInTheDocument();
  });

  it("shows the recurring count", () => {
    renderStrip({ recurringCount: 2 });
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("formats the recurring net per month", () => {
    renderStrip({ recurringNet: -150000 });
    // -150000 cents → -1.500,00 €
    expect(screen.getByText(/1[.,]500/)).toBeInTheDocument();
  });
});
