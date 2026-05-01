// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import CategorySelect from "./CategorySelect";
import type { Category } from "../../../types/category";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const existingCategories: Category[] = [
  { id: "cat-1", name: "Food", isDefault: true },
  { id: "cat-2", name: "Income", isDefault: false },
];

const newCategory: Category = {
  id: "cat-3",
  name: "Transport",
  isDefault: false,
};

const renderSelect = (onChange = vi.fn()) => {
  render(
    <ThemeProvider theme={theme}>
      <CategorySelect onChange={onChange} />
    </ThemeProvider>
  );
  return { onChange };
};

describe("CategorySelect — dropdown population", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => existingCategories,
    } as Response);
  });

  it("populates the dropdown with categories fetched from GET /categories", async () => {
    renderSelect();

    expect(
      await screen.findByRole("option", { name: "Food" })
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Income" })).toBeInTheDocument();
  });

  it("calls onChange with the first category id on initial load", async () => {
    const { onChange } = renderSelect();

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(existingCategories[0].id);
    });
  });
});

describe("CategorySelect — inline category add", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => existingCategories,
    } as Response);
  });

  it("includes a '+ Add category' option in the dropdown", async () => {
    renderSelect();

    await screen.findByRole("option", { name: "Food" });

    expect(
      screen.getByRole("option", { name: /\+\s*add category/i })
    ).toBeInTheDocument();
  });

  it("reveals a text input when '+ Add category' is selected", async () => {
    renderSelect();

    const select = await screen.findByLabelText(/category/i);
    const addOption = screen.getByRole("option", {
      name: /\+\s*add category/i,
    });
    fireEvent.change(select, {
      target: { value: addOption.getAttribute("value") },
    });

    expect(
      screen.getByRole("textbox", { name: /new category/i })
    ).toBeInTheDocument();
  });

  it("appends the new category, auto-selects it, and calls onChange with its id", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingCategories,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newCategory,
      } as Response);

    const { onChange } = renderSelect();

    const select = await screen.findByLabelText(/category/i);
    const addOption = screen.getByRole("option", {
      name: /\+\s*add category/i,
    });
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
    expect(screen.getByLabelText(/category/i)).toHaveValue(newCategory.id);
    expect(onChange).toHaveBeenCalledWith(newCategory.id);
  });

  it("disables form controls while category creation is in flight", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingCategories,
      } as Response)
      .mockImplementationOnce(() => new Promise(() => {})); // never resolves

    renderSelect();

    const select = await screen.findByLabelText(/category/i);
    const addOption = screen.getByRole("option", {
      name: /\+\s*add category/i,
    });
    fireEvent.change(select, {
      target: { value: addOption.getAttribute("value") },
    });

    fireEvent.change(screen.getByRole("textbox", { name: /new category/i }), {
      target: { value: "Transport" },
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /add category/i }));
    });

    expect(
      screen.getByRole("textbox", { name: /new category/i })
    ).toBeDisabled();
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

    renderSelect();

    const select = await screen.findByLabelText(/category/i);
    const addOption = screen.getByRole("option", {
      name: /\+\s*add category/i,
    });
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

    await waitFor(() => {
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    });
  });
});
