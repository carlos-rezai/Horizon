// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import type { Category } from "../../../types/category";
import CategoriesCard from "./CategoriesCard";

const defaults: Category[] = [
  {
    id: "d-food",
    name: "Food",
    isDefault: true,
    color: "#74C29B",
    hidden: false,
  },
  {
    id: "d-income",
    name: "Income",
    isDefault: true,
    color: "#7FA7D9",
    hidden: false,
  },
];

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => defaults,
  } as Response);
});

describe("CategoriesCard", () => {
  it("renders a 'Manage categories' button", () => {
    renderWithTheme(<CategoriesCard />);

    expect(
      screen.getByRole("button", { name: /manage categories/i })
    ).toBeInTheDocument();
  });

  it("does not show the manager modal until the button is clicked", () => {
    renderWithTheme(<CategoriesCard />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the CategoryManagerModal when the button is clicked", async () => {
    renderWithTheme(<CategoriesCard />);

    fireEvent.click(screen.getByRole("button", { name: /manage categories/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
