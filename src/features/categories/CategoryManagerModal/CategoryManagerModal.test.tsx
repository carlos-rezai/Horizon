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

describe("CategoryManagerModal — add a custom category (issue #159)", () => {
  const createdVet: Category = {
    id: "c-new-vet",
    name: "Vet",
    isDefault: false,
    color: NEW_COLOR,
    hidden: false,
  };

  it("renders an inline add-row in the Custom section (name field + palette swatches + confirm)", async () => {
    renderModal([foodDefault, incomeDefault]);

    const addRow = await screen.findByTestId("category-add-row");
    expect(
      within(addRow).getByLabelText(/new category name/i)
    ).toBeInTheDocument();
    expect(
      within(addRow).getByRole("button", { name: /add category/i })
    ).toBeInTheDocument();
    // the same fixed palette used for recolor is offered for the new category
    for (const hex of categoryColorPalette) {
      expect(
        within(addRow).getByRole("button", { name: hex })
      ).toBeInTheDocument();
    }
  });

  it("POSTs the name and chosen color, then shows the new category in the Custom section", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodDefault, incomeDefault],
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => createdVet,
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const addRow = await screen.findByTestId("category-add-row");
    fireEvent.change(within(addRow).getByLabelText(/new category name/i), {
      target: { value: "Vet" },
    });
    fireEvent.click(within(addRow).getByRole("button", { name: NEW_COLOR }));
    fireEvent.click(
      within(addRow).getByRole("button", { name: /add category/i })
    );

    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/categories") &&
          (init as RequestInit | undefined)?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.name).toBe("Vet");
      expect(body.color).toBe(NEW_COLOR);
    });

    expect(await screen.findByText("Vet")).toBeInTheDocument();
    expect(
      screen.queryByText(/no custom categories yet/i)
    ).not.toBeInTheDocument();
  });

  it("surfaces a clear error message when the create is rejected", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodDefault, incomeDefault],
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'A category named "Food" already exists' }),
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const addRow = await screen.findByTestId("category-add-row");
    fireEvent.change(within(addRow).getByLabelText(/new category name/i), {
      target: { value: "Food" },
    });
    fireEvent.click(
      within(addRow).getByRole("button", { name: /add category/i })
    );

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });
});

describe("CategoryManagerModal — rename a custom category (issue #160)", () => {
  it("exposes a rename control on custom rows only, never on default rows", async () => {
    renderModal([foodDefault, incomeDefault, vetCustom]);

    const customRow = await screen.findByTestId(`category-row-${vetCustom.id}`);
    expect(
      within(customRow).getByRole("button", { name: /rename/i })
    ).toBeInTheDocument();

    const defaultRow = screen.getByTestId(`category-row-${foodDefault.id}`);
    expect(
      within(defaultRow).queryByRole("button", { name: /rename/i })
    ).not.toBeInTheDocument();
  });

  it("PATCHes the new name and reflects it in the row immediately", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodDefault, vetCustom],
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...vetCustom, name: "Pets" }),
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const row = await screen.findByTestId(`category-row-${vetCustom.id}`);
    fireEvent.click(within(row).getByRole("button", { name: /rename/i }));

    const input = within(
      screen.getByTestId(`category-row-${vetCustom.id}`)
    ).getByRole("textbox");
    fireEvent.change(input, { target: { value: "Pets" } });
    fireEvent.click(
      within(screen.getByTestId(`category-row-${vetCustom.id}`)).getByRole(
        "button",
        { name: /save/i }
      )
    );

    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes(`/categories/${vetCustom.id}`) &&
          (init as RequestInit | undefined)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string);
      expect(body.name).toBe("Pets");
    });

    expect(await screen.findByText("Pets")).toBeInTheDocument();
    expect(screen.queryByText("Vet")).not.toBeInTheDocument();
  });

  it("surfaces a clear error message when the rename is rejected", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodDefault, vetCustom],
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'A category named "Food" already exists' }),
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const row = await screen.findByTestId(`category-row-${vetCustom.id}`);
    fireEvent.click(within(row).getByRole("button", { name: /rename/i }));

    const input = within(
      screen.getByTestId(`category-row-${vetCustom.id}`)
    ).getByRole("textbox");
    fireEvent.change(input, { target: { value: "Food" } });
    fireEvent.click(
      within(screen.getByTestId(`category-row-${vetCustom.id}`)).getByRole(
        "button",
        { name: /save/i }
      )
    );

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    // the row keeps its original name after a rejected rename
    expect(screen.getByText("Vet")).toBeInTheDocument();
  });
});
