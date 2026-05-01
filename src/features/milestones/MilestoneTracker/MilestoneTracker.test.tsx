// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import MilestoneTracker from "./MilestoneTracker";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { Milestone } from "../../../types/milestone";

afterEach(() => {
  cleanup();
});

const tagesgeldAccount: AccountWithBalance = {
  id: "acc-1",
  kind: "Tagesgeld",
  name: "DKB Reserve",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 50000,
};

const milestone: Milestone = {
  id: "ms-1",
  name: "Emergency fund",
  accountId: "acc-1",
  targetBalance: 100000,
};

// Snapshots where acc-1 reaches 100000 at 2028-06
const reachingSnapshots: MonthlySnapshot[] = Array.from(
  { length: 120 },
  (_, i) => {
    const year = 2026 + Math.floor(i / 12);
    const month = String((i % 12) + 1).padStart(2, "0");
    return {
      month: `${year}-${month}`,
      accounts: { "acc-1": { projected: 50000 + i * 1000 } },
      netCashflow: 0,
      totalLiquid: 0,
    };
  }
);

// Snapshots where acc-1 never reaches 100000
const nonReachingSnapshots: MonthlySnapshot[] = Array.from(
  { length: 120 },
  (_, i) => {
    const year = 2026 + Math.floor(i / 12);
    const month = String((i % 12) + 1).padStart(2, "0");
    return {
      month: `${year}-${month}`,
      accounts: { "acc-1": { projected: 60000 } },
      netCashflow: 0,
      totalLiquid: 0,
    };
  }
);

describe("MilestoneTracker", () => {
  it("shows empty state when no milestones exist", () => {
    renderWithTheme(
      <MilestoneTracker
        milestones={[]}
        accounts={[tagesgeldAccount]}
        snapshots={[]}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText(/no milestones/i)).toBeInTheDocument();
  });

  it("renders each milestone card with name, target account name, and target balance", () => {
    renderWithTheme(
      <MilestoneTracker
        milestones={[milestone]}
        accounts={[tagesgeldAccount]}
        snapshots={nonReachingSnapshots}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const list = screen.getByRole("list");
    expect(within(list).getByText("Emergency fund")).toBeInTheDocument();
    expect(within(list).getByText("DKB Reserve")).toBeInTheDocument();
    // targetBalance 100000 cents = 1.000,00 €
    expect(within(list).getByText(/1[.,]000/)).toBeInTheDocument();
  });

  it('shows "Not reached within 10-year horizon." when completion month is null', () => {
    renderWithTheme(
      <MilestoneTracker
        milestones={[milestone]}
        accounts={[tagesgeldAccount]}
        snapshots={nonReachingSnapshots}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(
      screen.getByText("Not reached within 10-year horizon.")
    ).toBeInTheDocument();
  });

  it("shows the estimated completion month when the target is reached", () => {
    renderWithTheme(
      <MilestoneTracker
        milestones={[milestone]}
        accounts={[tagesgeldAccount]}
        snapshots={reachingSnapshots}
        onAdd={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Should display a YYYY-MM month string
    expect(screen.getByText(/\d{4}-\d{2}/)).toBeInTheDocument();
  });

  it("calls onAdd with name, accountId, and targetBalance when the form is submitted", () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);

    renderWithTheme(
      <MilestoneTracker
        milestones={[]}
        accounts={[tagesgeldAccount]}
        snapshots={[]}
        onAdd={onAdd}
        onDelete={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "New goal" },
    });
    fireEvent.change(screen.getByLabelText(/account/i), {
      target: { value: "acc-1" },
    });
    fireEvent.change(screen.getByLabelText(/target balance/i), {
      target: { value: "200000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    expect(onAdd).toHaveBeenCalledWith({
      name: "New goal",
      accountId: "acc-1",
      targetBalance: 200000,
    });
  });

  it("does not call onAdd when the name field is empty", () => {
    const onAdd = vi.fn();

    renderWithTheme(
      <MilestoneTracker
        milestones={[]}
        accounts={[tagesgeldAccount]}
        snapshots={[]}
        onAdd={onAdd}
        onDelete={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/target balance/i), {
      target: { value: "100000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("does not call onAdd when the target balance field is empty", () => {
    const onAdd = vi.fn();

    renderWithTheme(
      <MilestoneTracker
        milestones={[]}
        accounts={[tagesgeldAccount]}
        snapshots={[]}
        onAdd={onAdd}
        onDelete={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Emergency fund" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("calls onDelete with the milestone id when the delete button is clicked", () => {
    const onDelete = vi.fn();

    renderWithTheme(
      <MilestoneTracker
        milestones={[milestone]}
        accounts={[tagesgeldAccount]}
        snapshots={nonReachingSnapshots}
        onAdd={vi.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(onDelete).toHaveBeenCalledWith("ms-1");
  });

  it("retains form values when onAdd rejects", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("Server error"));

    renderWithTheme(
      <MilestoneTracker
        milestones={[]}
        accounts={[tagesgeldAccount]}
        snapshots={[]}
        onAdd={onAdd}
        onDelete={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Emergency fund" },
    });
    fireEvent.change(screen.getByLabelText(/target balance/i), {
      target: { value: "100000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    expect(
      await screen.findByDisplayValue("Emergency fund")
    ).toBeInTheDocument();
    expect(await screen.findByDisplayValue("100000")).toBeInTheDocument();
  });

  it("renders an error message when onAdd rejects", async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error("Server error"));

    renderWithTheme(
      <MilestoneTracker
        milestones={[]}
        accounts={[tagesgeldAccount]}
        snapshots={[]}
        onAdd={onAdd}
        onDelete={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Emergency fund" },
    });
    fireEvent.change(screen.getByLabelText(/target balance/i), {
      target: { value: "100000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add/i }));

    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });
});
