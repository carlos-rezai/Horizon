// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import ImportHistory from "./ImportHistory";
import Button from "../../../primitives/Button/Button";
import type { ImportedStatement } from "../importTypes/importTypes";
import type { AccountWithBalance } from "../../../types/account";
import { columnOf, deepestWithText } from "../../../testing/columnOf/columnOf";

afterEach(() => {
  cleanup();
});

const ACCOUNT: AccountWithBalance = {
  id: "a-main",
  kind: "Girokonto",
  name: "Main",
  anchorBalance: 0,
  anchorDate: "2026-01-01",
  balance: 100000,
};

const STATEMENT: ImportedStatement = {
  id: "s-1",
  accountId: "a-main",
  bank: "Sparkasse",
  filename: "umsaetze-2026-03.csv",
  year: 2026,
  from: "2026-03-01",
  to: "2026-03-31",
  count: 42,
  importedOn: "2026-04-02",
  sizeKB: 12,
  txns: [],
};

function renderHistory(
  onPreview: (s: ImportedStatement) => void = vi.fn(),
  onDelete: (s: ImportedStatement) => void = vi.fn()
) {
  return render(
    <ThemeProvider theme={theme}>
      <ImportHistory
        history={[STATEMENT]}
        importAccounts={[ACCOUNT]}
        activeAccountId="all"
        onAccountChange={vi.fn()}
        onPreview={onPreview}
        onDelete={onDelete}
        onStartImport={vi.fn()}
      />
    </ThemeProvider>
  );
}

/**
 * A reference Button in the given ghost variant, small, icon-only. Matching
 * its generated classes proves a control is that Button — one Control Height
 * sm, one hover, one focus ring — rather than a hand-sized look-alike.
 */
function referenceIconButtonClass(
  variant: "ghost" | "ghostDanger" = "ghost"
): string {
  const { getByRole, unmount } = render(
    <ThemeProvider theme={theme}>
      <Button
        variant={variant}
        size="sm"
        icon="Search"
        aria-label="Reference"
      />
    </ThemeProvider>
  );
  const className = getByRole("button", { name: "Reference" }).className;
  unmount();
  return className;
}

/** An icon-only control: an svg glyph and no visible text. */
function expectIconOnly(el: HTMLElement) {
  expect(el.querySelector("svg")).toBeInTheDocument();
  expect(el.textContent).toBe("");
}

// Issue #272 — feature icon buttons onto Button.
describe("ImportHistory — row actions are the shared icon button", () => {
  it("renders Preview as the ghost, small, icon-only Button, keeping its handler", () => {
    const onPreview = vi.fn();
    renderHistory(onPreview);
    const preview = screen.getByRole("button", { name: "Preview" });

    expect(preview.className).toBe(referenceIconButtonClass());
    expectIconOnly(preview);

    fireEvent.click(preview);
    expect(onPreview).toHaveBeenCalledWith(STATEMENT);
  });

  it("renders Delete import as the ghostDanger Button, which turns the error colour on hover, keeping its handler", () => {
    const onDelete = vi.fn();
    renderHistory(vi.fn(), onDelete);
    const del = screen.getByRole("button", { name: "Delete import" });

    expect(del.className).toBe(referenceIconButtonClass("ghostDanger"));
    expectIconOnly(del);

    fireEvent.click(del);
    expect(onDelete).toHaveBeenCalledWith(STATEMENT);
  });
});

// Issue #274 (Audit Finding 22) — the year header and its statement rows share
// one column definition, so the year's tx count stacks over each statement's.
// With one 42-row statement both read "42 tx": the year header's first, then
// the statement row's.
describe("ImportHistory — year and statement counts share a column (#274)", () => {
  it("stacks the year's tx count over the statement's tx count", () => {
    const { container } = renderHistory();

    const yearCount = columnOf(deepestWithText(container, "42 tx", 0));
    const rowCount = columnOf(deepestWithText(container, "42 tx", 1));

    expect(yearCount).not.toBeNull();
    expect(rowCount).toEqual(yearCount);
  });
});
