// @vitest-environment jsdom
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import { categoryColorPalette } from "../../../utils/categoryColor/categoryColor";
import type { Category } from "../../../types/category";
import CategoryManagerModal from "./CategoryManagerModal";

const NEW_COLOR = "#6FBFBF"; // cyan — a palette member, distinct from Vet's colour

const foodDefault: Category = {
  id: "d-food",
  name: "Food",
  isDefault: true,
  color: "#74C29B",
  hidden: false,
};
const incomeDefault: Category = {
  id: "d-income",
  name: "Income",
  isDefault: true,
  color: "#7FA7D9",
  hidden: false,
};
const vetCustom: Category = {
  id: "c-vet",
  name: "Vet",
  isDefault: false,
  color: "#909AAE",
  hidden: false,
};

function renderModal(list: Category[]) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => list,
  } as Response);

  return render(
    <ThemeProvider theme={theme}>
      <CategoryManagerModal onClose={vi.fn()} />
    </ThemeProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CategoryManagerModal — sections", () => {
  it("renders a Default section listing the seeded default categories", async () => {
    renderModal([foodDefault, incomeDefault]);

    expect(await screen.findByText(/default/i)).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
  });

  it("shows a 'no custom categories yet' empty state when there are no custom categories", async () => {
    renderModal([foodDefault, incomeDefault]);

    expect(
      await screen.findByText(/no custom categories yet/i)
    ).toBeInTheDocument();
  });

  it("lists custom categories in the Custom section (no empty state)", async () => {
    renderModal([foodDefault, incomeDefault, vetCustom]);

    expect(await screen.findByText("Vet")).toBeInTheDocument();
    expect(
      screen.queryByText(/no custom categories yet/i)
    ).not.toBeInTheDocument();
  });
});

describe("CategoryManagerModal — recolor swatches", () => {
  it("exposes the full 20-swatch palette per row and offers no freeform hex input", async () => {
    renderModal([foodDefault, incomeDefault]);

    const row = await screen.findByTestId(`category-row-${foodDefault.id}`);

    for (const hex of categoryColorPalette) {
      expect(
        within(row).getByRole("button", { name: hex })
      ).toBeInTheDocument();
    }

    // freeform hex entry is never offered
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("PATCHes the category and reflects the new colour when a swatch is clicked", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodDefault, vetCustom],
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...vetCustom, color: NEW_COLOR }),
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const row = await screen.findByTestId(`category-row-${vetCustom.id}`);
    const swatch = within(row).getByRole("button", { name: NEW_COLOR });

    fireEvent.click(swatch);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining(`/categories/${vetCustom.id}`),
        expect.objectContaining({ method: "PATCH" })
      );
    });

    await waitFor(() => {
      expect(
        within(screen.getByTestId(`category-row-${vetCustom.id}`)).getByRole(
          "button",
          { name: NEW_COLOR }
        )
      ).toHaveAttribute("aria-pressed", "true");
    });
  });
});
