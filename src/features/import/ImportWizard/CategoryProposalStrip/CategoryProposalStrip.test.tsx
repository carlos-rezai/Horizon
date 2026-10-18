// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../../tokens";
import CategoryProposalStrip from "./CategoryProposalStrip";
import type { CategoryProposal } from "../../useCategoryProposals/useCategoryProposals";

afterEach(() => {
  cleanup();
});

function renderStrip(
  proposal: CategoryProposal,
  onCreate = vi.fn(),
  onDismiss = vi.fn()
) {
  render(
    <ThemeProvider theme={theme}>
      <CategoryProposalStrip
        proposal={proposal}
        onCreate={onCreate}
        onDismiss={onDismiss}
      />
    </ThemeProvider>
  );
  return { onCreate, onDismiss };
}

describe("CategoryProposalStrip", () => {
  it("names the proposed category and its rows, pluralized", () => {
    renderStrip({ name: "Dining", count: 3, error: null });

    expect(screen.getByText("Dining")).toBeTruthy();
    expect(screen.getByText(/New category:/).textContent).toBe(
      "New category: Dining · 3 rows"
    );
  });

  it("says one row in the singular", () => {
    renderStrip({ name: "Dining", count: 1, error: null });

    expect(screen.getByText(/New category:/).textContent).toBe(
      "New category: Dining · 1 row"
    );
  });

  it("calls onCreate from Create category", () => {
    const { onCreate, onDismiss } = renderStrip({
      name: "Dining",
      count: 2,
      error: null,
    });

    fireEvent.click(screen.getByRole("button", { name: /create category/i }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("calls onDismiss from Dismiss", () => {
    const { onCreate, onDismiss } = renderStrip({
      name: "Dining",
      count: 2,
      error: null,
    });

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("shows no alert while there is no error", () => {
    renderStrip({ name: "Dining", count: 2, error: null });

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a failed create's error as an alert", () => {
    renderStrip({ name: "Dining", count: 2, error: "Name already exists" });

    expect(screen.getByRole("alert").textContent).toBe("Name already exists");
  });
});
