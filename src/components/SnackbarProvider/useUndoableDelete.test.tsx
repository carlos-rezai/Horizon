// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SnackbarProvider from "./SnackbarProvider";
import { useUndoableDelete } from "./useUndoableDelete";

afterEach(() => {
  cleanup();
});

interface HarnessProps<T> {
  item: T;
  remove: (item: T) => Promise<void>;
  recreate: (item: T) => Promise<void>;
}

function Harness<T>({ item, remove, recreate }: HarnessProps<T>) {
  const deleteWithUndo = useUndoableDelete<T>({
    remove,
    recreate,
    message: () => "Deleted",
  });
  return <button onClick={() => deleteWithUndo(item)}>Delete</button>;
}

function renderHarness<T>(props: HarnessProps<T>) {
  return render(
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <Harness {...props} />
      </SnackbarProvider>
    </ThemeProvider>
  );
}

const transaction = {
  id: "t1",
  date: "2026-06-01",
  amount: -1200,
  description: "Groceries",
  category: "Food",
};

const oneOffTransfer = {
  id: "x1",
  transferId: "tr1",
  amount: -5000,
  description: "To savings",
  category: "Transfer",
};

const recurring = {
  id: "r1",
  amount: -90000,
  description: "Rent",
  category: "Housing",
  frequency: "monthly",
  dayOfMonth: 1,
};

describe.each([
  ["transaction", transaction],
  ["one-off transfer", oneOffTransfer],
  ["recurring", recurring],
])("useUndoableDelete (%s)", (_label, item) => {
  it("removes the item and surfaces an Undo action", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const recreate = vi.fn().mockResolvedValue(undefined);
    renderHarness({ item, remove, recreate });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith(item));
    expect(
      await screen.findByRole("button", { name: "Undo" })
    ).toBeInTheDocument();
  });

  it("re-creates the exact captured payload when Undo is clicked", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const recreate = vi.fn().mockResolvedValue(undefined);
    renderHarness({ item, remove, recreate });

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await waitFor(() => expect(recreate).toHaveBeenCalledWith(item));
  });
});
