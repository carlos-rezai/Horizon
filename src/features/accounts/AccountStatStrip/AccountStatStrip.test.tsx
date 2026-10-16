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
        anchorBalance={props.anchorBalance ?? 1274000}
        anchorDate={props.anchorDate ?? "2025-01-01"}
        recurringCount={props.recurringCount ?? 2}
        recurringNet={props.recurringNet ?? -150000}
      />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe("AccountStatStrip", () => {
  it("renders the Balance anchor and recurring stat labels", () => {
    renderStrip();
    expect(screen.getByText(/^balance anchor$/i)).toBeInTheDocument();
    expect(screen.queryByText(/opening balance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/opening date/i)).not.toBeInTheDocument();
    expect(screen.getByText(/^recurring$/i)).toBeInTheDocument();
    expect(screen.getByText(/recurring net/i)).toBeInTheDocument();
  });

  it("formats the anchor balance", () => {
    renderStrip({ anchorBalance: 1274000 });
    // 1274000 cents → 12.740,00 €
    expect(screen.getByText(/12[.,]740/)).toBeInTheDocument();
  });

  it('shows the Anchor Date as "as of {date}"', () => {
    renderStrip({ anchorDate: "2025-01-01" });
    expect(screen.getByText(/^as of 2025-01-01$/i)).toBeInTheDocument();
  });

  it("shows the anchor amount and its date together under Balance anchor", () => {
    renderStrip({ anchorBalance: 254321, anchorDate: "2026-03-31" });
    const label = screen.getByText(/^balance anchor$/i);
    const cell = label.closest("[data-testid='account-stat-strip'] > *");
    expect(cell).not.toBeNull();
    expect(cell).toHaveTextContent(/2[.,]543[.,]21/);
    expect(cell).toHaveTextContent(/as of 2026-03-31/i);
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
