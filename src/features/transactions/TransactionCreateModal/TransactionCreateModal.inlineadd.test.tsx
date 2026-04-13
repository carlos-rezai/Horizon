// @vitest-environment jsdom
// These tests target the post-#17 interface where TransactionCreateModal
// fetches categories internally via useCategoriesWithInlineAdd.
// The `categories` prop is removed in the build phase.
// NOTE: existing TransactionCreateModal.test.tsx will need its fetch mock
// updated in build to also handle GET /categories.
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import TransactionCreateModal from "./TransactionCreateModal";
import type { Category } from "../../../types/category";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const existingCategories: Category[] = [
  { _id: "cat-1", name: "Food", isDefault: true },
  { _id: "cat-2", name: "Income", isDefault: false },
];

const newCategory: Category = {
  _id: "cat-3",
  name: "Transport",
  isDefault: false,
};

// Renders the modal using the new interface (no categories prop)
const renderModal = (
  overrides: Partial<{ onClose: () => void; onSuccess: () => void }> = {}
) => {
  const props = {
    accountId: "acc-1",
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    ...overrides,
  };
  render(<TransactionCreateModal {...props} />);
  return props;
};

describe("TransactionCreateModal — category dropdown population", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => existingCategories,
    } as Response);
  });

  it("populates the dropdown with categories fetched from GET /categories", async () => {
    renderModal();

    expect(await screen.findByRole("option", { name: "Food" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Income" })).toBeInTheDocument();
  });
});

describe("TransactionCreateModal — inline category add", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => existingCategories,
    } as Response);
  });

  it("includes a '+ Add category' option in the dropdown", async () => {
    renderModal();

    await screen.findByRole("option", { name: "Food" });

    expect(
      screen.getByRole("option", { name: /\+\s*add category/i })
    ).toBeInTheDocument();
  });

  it("reveals a text input when '+ Add category' is selected", async () => {
    renderModal();

    const select = await screen.findByLabelText(/category/i);
    const addOption = screen.getByRole("option", { name: /\+\s*add category/i });
    fireEvent.change(select, {
      target: { value: addOption.getAttribute("value") },
    });

    expect(
      screen.getByRole("textbox", { name: /new category/i })
    ).toBeInTheDocument();
  });

  it("appends the new category and auto-selects it after submitting the inline input", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingCategories,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newCategory,
      } as Response);

    renderModal();

    const select = await screen.findByLabelText(/category/i);
    const addOption = screen.getByRole("option", { name: /\+\s*add category/i });
    fireEvent.change(select, {
      target: { value: addOption.getAttribute("value") },
    });

    fireEvent.change(screen.getByRole("textbox", { name: /new category/i }), {
      target: { value: "Transport" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add category/i }));

    expect(
      await screen.findByRole("option", { name: "Transport" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toHaveValue(newCategory._id);
  });

  it("disables form controls while category creation is in flight", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingCategories,
      } as Response)
      .mockImplementationOnce(() => new Promise(() => {})); // never resolves

    renderModal();

    const select = await screen.findByLabelText(/category/i);
    const addOption = screen.getByRole("option", { name: /\+\s*add category/i });
    fireEvent.change(select, {
      target: { value: addOption.getAttribute("value") },
    });

    fireEvent.change(screen.getByRole("textbox", { name: /new category/i }), {
      target: { value: "Transport" },
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /add category/i }));
    });

    expect(screen.getByLabelText(/category/i)).toBeDisabled();
  });

  it("shows an error and restores the dropdown when category creation fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingCategories,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Category already exists" }),
      } as Response);

    renderModal();

    const select = await screen.findByLabelText(/category/i);
    const addOption = screen.getByRole("option", { name: /\+\s*add category/i });
    fireEvent.change(select, {
      target: { value: addOption.getAttribute("value") },
    });

    fireEvent.change(screen.getByRole("textbox", { name: /new category/i }), {
      target: { value: "Food" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add category/i }));

    expect(
      await screen.findByText(/category already exists/i)
    ).toBeInTheDocument();

    // Dropdown is still present (form not stuck in text-input mode)
    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });
  });
});
