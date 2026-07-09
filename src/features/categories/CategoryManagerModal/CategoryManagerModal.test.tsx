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
const miscDefault: Category = {
  id: "d-misc",
  name: "Miscellaneous",
  isDefault: true,
  color: "#909AAE",
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

describe("CategoryManagerModal — delete a custom category (issue #161)", () => {
  it("exposes a delete control on custom rows only, never on default rows", async () => {
    renderModal([foodDefault, miscDefault, vetCustom]);

    const customRow = await screen.findByTestId(`category-row-${vetCustom.id}`);
    expect(
      within(customRow).getByRole("button", { name: /delete/i })
    ).toBeInTheDocument();

    const defaultRow = screen.getByTestId(`category-row-${foodDefault.id}`);
    expect(
      within(defaultRow).queryByRole("button", { name: /delete/i })
    ).not.toBeInTheDocument();
  });

  it("deletes an unused custom category outright and removes it from the list", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodDefault, miscDefault, vetCustom],
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const row = await screen.findByTestId(`category-row-${vetCustom.id}`);
    fireEvent.click(within(row).getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      const deleteCall = fetchSpy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes(`/categories/${vetCustom.id}`) &&
          (init as RequestInit | undefined)?.method === "DELETE"
      );
      expect(deleteCall).toBeDefined();
      // an unused delete never carries a reassign target
      expect(deleteCall![0] as string).not.toContain("reassignTo");
    });

    await waitFor(() => {
      expect(screen.queryByText("Vet")).not.toBeInTheDocument();
    });
  });

  it("opens a reassign prompt for an in-use custom category, excluding it from the target picker and defaulting to Miscellaneous", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodDefault, miscDefault, vetCustom],
    } as Response);
    // the plain delete is blocked because the category is in use
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Category is referenced by transactions" }),
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const row = await screen.findByTestId(`category-row-${vetCustom.id}`);
    fireEvent.click(within(row).getByRole("button", { name: /delete/i }));

    const picker = (await screen.findByRole("combobox")) as HTMLSelectElement;
    // the category being deleted is never a reassign target
    expect(
      within(picker).queryByRole("option", { name: "Vet" })
    ).not.toBeInTheDocument();
    // a real target is offered, defaulting to Miscellaneous
    expect(
      within(picker).getByRole("option", { name: "Miscellaneous" })
    ).toBeInTheDocument();
    expect(picker.value).toBe(miscDefault.id);
  });

  it("confirming the reassign prompt DELETEs with the chosen reassign target and removes the row", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodDefault, miscDefault, vetCustom],
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Category is referenced by transactions" }),
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const row = await screen.findByTestId(`category-row-${vetCustom.id}`);
    fireEvent.click(within(row).getByRole("button", { name: /delete/i }));

    await screen.findByRole("combobox");
    fireEvent.click(
      screen.getByRole("button", { name: /reassign and delete/i })
    );

    await waitFor(() => {
      const reassignCall = fetchSpy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes(`/categories/${vetCustom.id}`) &&
          url.includes(`reassignTo=${miscDefault.id}`) &&
          (init as RequestInit | undefined)?.method === "DELETE"
      );
      expect(reassignCall).toBeDefined();
    });

    await waitFor(() => {
      expect(screen.queryByText("Vet")).not.toBeInTheDocument();
    });
  });
});

describe("CategoryManagerModal — hide / un-hide a default category (issue #162)", () => {
  const foodHidden: Category = { ...foodDefault, hidden: true };

  it("exposes a hide toggle on default rows only, never on custom rows", async () => {
    renderModal([foodDefault, vetCustom]);

    const defaultRow = await screen.findByTestId(
      `category-row-${foodDefault.id}`
    );
    expect(
      within(defaultRow).getByRole("button", { name: /^hide$/i })
    ).toBeInTheDocument();

    const customRow = screen.getByTestId(`category-row-${vetCustom.id}`);
    expect(
      within(customRow).queryByRole("button", { name: /hide/i })
    ).not.toBeInTheDocument();
  });

  it("PATCHes { hidden: true } and marks the row hidden/disabled when Hide is clicked", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodDefault, incomeDefault],
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...foodDefault, hidden: true }),
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const row = await screen.findByTestId(`category-row-${foodDefault.id}`);
    fireEvent.click(within(row).getByRole("button", { name: /^hide$/i }));

    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes(`/categories/${foodDefault.id}`) &&
          (init as RequestInit | undefined)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string);
      expect(body.hidden).toBe(true);
    });

    await waitFor(() => {
      const updated = screen.getByTestId(`category-row-${foodDefault.id}`);
      expect(updated).toHaveAttribute("aria-disabled", "true");
      expect(
        within(updated).getByRole("button", { name: /un-?hide/i })
      ).toBeInTheDocument();
    });
  });

  it("renders an already-hidden default as disabled with an Un-hide toggle, and un-hides it (reversible)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => [foodHidden, incomeDefault],
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...foodHidden, hidden: false }),
    } as Response);

    render(
      <ThemeProvider theme={theme}>
        <CategoryManagerModal onClose={vi.fn()} />
      </ThemeProvider>
    );

    const row = await screen.findByTestId(`category-row-${foodHidden.id}`);
    expect(row).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(within(row).getByRole("button", { name: /un-?hide/i }));

    await waitFor(() => {
      const patchCall = fetchSpy.mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes(`/categories/${foodHidden.id}`) &&
          (init as RequestInit | undefined)?.method === "PATCH"
      );
      expect(patchCall).toBeDefined();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string);
      expect(body.hidden).toBe(false);
    });

    await waitFor(() => {
      const updated = screen.getByTestId(`category-row-${foodHidden.id}`);
      expect(updated).not.toHaveAttribute("aria-disabled", "true");
      expect(
        within(updated).getByRole("button", { name: /^hide$/i })
      ).toBeInTheDocument();
    });
  });
});
