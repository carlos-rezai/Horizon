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
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import CategorySelect from "./CategorySelect";
import FormField from "../../../components/FormField/FormField";
import type { Category } from "../../../types/category";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const existingCategories: Category[] = [
  {
    id: "cat-1",
    name: "Food",
    isDefault: true,
    color: "#74C29B",
    hidden: false,
  },
  {
    id: "cat-2",
    name: "Income",
    isDefault: false,
    color: "#7FA7D9",
    hidden: false,
  },
];

const newCategory: Category = {
  id: "cat-3",
  name: "Transport",
  isDefault: false,
  color: "#E0A86B",
  hidden: false,
};

const renderSelect = (onChange = vi.fn()) => {
  render(
    <CacheProvider>
      <ThemeProvider theme={theme}>
        <CategorySelect onChange={onChange} />
      </ThemeProvider>
    </CacheProvider>
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

  it("calls onChange with the first category name on initial load", async () => {
    const { onChange } = renderSelect();

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(existingCategories[0].name);
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

  it("appends the new category, auto-selects it, and calls onChange with its name", async () => {
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
    expect(onChange).toHaveBeenCalledWith(newCategory.name);
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

describe("CategorySelect — hidden categories (issue #162)", () => {
  const withHidden: Category[] = [
    {
      id: "cat-food",
      name: "Food",
      isDefault: true,
      color: "#74C29B",
      hidden: false,
    },
    {
      id: "cat-archived",
      name: "Archived",
      isDefault: true,
      color: "#909AAE",
      hidden: true,
    },
  ];

  it("omits hidden categories from the dropdown", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => withHidden,
    } as Response);

    renderSelect();

    expect(
      await screen.findByRole("option", { name: "Food" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Archived" })
    ).not.toBeInTheDocument();
  });

  it("always includes the currently-selected category, even if it is hidden", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => withHidden,
    } as Response);

    const onChange = vi.fn();
    render(
      <CacheProvider>
        <ThemeProvider theme={theme}>
          <CategorySelect onChange={onChange} initialCategory="Archived" />
        </ThemeProvider>
      </CacheProvider>
    );

    // the hidden category the row already sits in is still offered + selected
    expect(
      await screen.findByRole("option", { name: "Archived" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toHaveValue("cat-archived");

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("Archived");
    });
  });
});

/**
 * The Import wizard's review table renders one `CategorySelect` per row, so the
 * component has to be safe to mount many times over. Hardcoded element ids
 * would collide, and a duplicated id silently re-points every `<label for>` at
 * the first match in the document — clicking row two's label would focus row
 * one's picker.
 */
describe("CategorySelect — many on one page", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => existingCategories,
    } as Response);
  });

  function renderThree() {
    render(
      <CacheProvider>
        <ThemeProvider theme={theme}>
          <CategorySelect onChange={vi.fn()} initialCategory="Food" />
          <CategorySelect onChange={vi.fn()} initialCategory="Income" />
          <CategorySelect onChange={vi.fn()} initialCategory="Food" />
        </ThemeProvider>
      </CacheProvider>
    );
  }

  it("gives each picker an id of its own", async () => {
    renderThree();
    await screen.findAllByRole("option", { name: "Food" });

    const ids = screen
      .getAllByLabelText(/^category$/i)
      .map((select) => select.id);

    expect(ids).toHaveLength(3);
    expect(ids.every((id) => id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(3);
  });

  it("points every label at its own picker, not at the first one on the page", async () => {
    renderThree();
    await screen.findAllByRole("option", { name: "Food" });

    const pickers = screen.getAllByLabelText(/^category$/i);
    const labels = Array.from(
      document.querySelectorAll<HTMLLabelElement>("label")
    );

    expect(labels).toHaveLength(3);
    labels.forEach((label, index) => {
      expect(label.control).toBe(pickers[index]);
    });
  });

  it("gives each inline-add field an id of its own once two rows are adding at once", async () => {
    renderThree();
    await screen.findAllByRole("option", { name: "Food" });

    const pickers = screen.getAllByLabelText(/^category$/i);
    fireEvent.change(pickers[0], { target: { value: "__add__" } });
    fireEvent.change(pickers[1], { target: { value: "__add__" } });

    const inputs = await screen.findAllByRole("textbox", {
      name: /new category/i,
    });
    const ids = inputs.map((input) => input.id);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    Array.from(document.querySelectorAll<HTMLLabelElement>("label"))
      .filter((label) => /new category/i.test(label.textContent ?? ""))
      .forEach((label, index) => {
        expect(label.control).toBe(inputs[index]);
      });
  });
});

/**
 * Issue #259 — Category Proposals and Same-Counterparty Propagation change a
 * row's category from outside the row's picker, so the picker has to follow a
 * controlled `value` rather than resolve `initialCategory` once on mount.
 */
describe("CategorySelect — controlled value (#259)", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => existingCategories,
    } as Response);
  });

  it("selects the controlled value over initialCategory", async () => {
    render(
      <CacheProvider>
        <ThemeProvider theme={theme}>
          <CategorySelect
            onChange={vi.fn()}
            value="Income"
            initialCategory="Food"
          />
        </ThemeProvider>
      </CacheProvider>
    );

    await screen.findByRole("option", { name: "Income" });

    await waitFor(() => {
      expect(screen.getByLabelText(/^category$/i)).toHaveValue("cat-2");
    });
  });

  it("follows the controlled value when it changes from outside", async () => {
    const tree = (value: string) => (
      <CacheProvider>
        <ThemeProvider theme={theme}>
          <CategorySelect onChange={vi.fn()} value={value} />
        </ThemeProvider>
      </CacheProvider>
    );
    const { rerender } = render(tree("Food"));

    await screen.findByRole("option", { name: "Income" });
    await waitFor(() => {
      expect(screen.getByLabelText(/^category$/i)).toHaveValue("cat-1");
    });

    rerender(tree("Income"));

    await waitFor(() => {
      expect(screen.getByLabelText(/^category$/i)).toHaveValue("cat-2");
    });
  });
});

/**
 * Issue #259 — a long statement renders one picker per row. They read the
 * Category list through the app cache, so N pickers make one request, and a
 * category added inline in one picker shows up in every other.
 */
describe("CategorySelect — shared cached categories (#259)", () => {
  const isCategoriesGet = ([url, init]: Parameters<typeof fetch>) =>
    String(url).includes("/categories") &&
    ((init as RequestInit | undefined)?.method ?? "GET") === "GET";

  it("makes one categories read for many pickers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => existingCategories,
    } as Response);

    render(
      <CacheProvider>
        <ThemeProvider theme={theme}>
          {Array.from({ length: 6 }, (_, i) => (
            <CategorySelect key={i} onChange={vi.fn()} value="Food" />
          ))}
        </ThemeProvider>
      </CacheProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByRole("option", { name: "Income" })).toHaveLength(6);
    });

    const gets = vi
      .mocked(fetch)
      .mock.calls.filter((call) => isCategoriesGet(call));
    expect(gets).toHaveLength(1);
  });

  it("shows a category added inline in one picker in the other pickers", async () => {
    // A stateful fake server: GET answers the current list, POST appends.
    let serverCategories: Category[] = [...existingCategories];
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (method === "POST") {
        serverCategories = [...serverCategories, newCategory];
        return Promise.resolve({
          ok: true,
          json: async () => newCategory,
        } as Response);
      }
      const snapshot = serverCategories;
      return Promise.resolve({
        ok: true,
        json: async () => snapshot,
      } as Response);
    });

    render(
      <CacheProvider>
        <ThemeProvider theme={theme}>
          <CategorySelect onChange={vi.fn()} value="Food" />
          <CategorySelect onChange={vi.fn()} value="Income" />
        </ThemeProvider>
      </CacheProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByRole("option", { name: "Income" })).toHaveLength(2);
    });

    const [first] = screen.getAllByLabelText(/^category$/i);
    fireEvent.change(first, { target: { value: "__add__" } });
    fireEvent.change(screen.getByRole("textbox", { name: /new category/i }), {
      target: { value: "Transport" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add category/i }));

    await waitFor(() => {
      expect(screen.getAllByRole("option", { name: "Transport" })).toHaveLength(
        2
      );
    });
  });
});

// Issue #275, Audit Finding 12 — the picker's visible label is the FormField
// label (the 11px uppercase overline every other field wears), not a label of
// its own wrapped round the select. Matching the generated classes of a
// reference FormField label proves it is that label, not a look-alike.
describe("CategorySelect — FormField label", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => existingCategories,
    } as Response);
  });

  function labelOf(select: HTMLElement): HTMLLabelElement | null {
    return document.querySelector(`label[for="${select.id}"]`);
  }

  it("labels the picker with the FormField label", async () => {
    renderSelect();
    render(
      <ThemeProvider theme={theme}>
        <FormField label="Reference" htmlFor="reference">
          <input id="reference" />
        </FormField>
      </ThemeProvider>
    );
    await screen.findByRole("option", { name: "Food" });

    const select = screen.getByRole("combobox", { name: "Category" });
    const label = labelOf(select);
    expect(label).not.toBeNull();
    expect(label?.textContent).toBe("Category");
    expect(label?.className).toBe(screen.getByText("Reference").className);
  });

  it("does not wrap the select inside its label", async () => {
    renderSelect();
    await screen.findByRole("option", { name: "Food" });
    const select = screen.getByRole("combobox", { name: "Category" });
    expect(labelOf(select)?.contains(select)).toBe(false);
  });
});

// Issue #275, Audit Finding 13 — where a table column header already names
// it, the picker drops its visible label but keeps its accessible name, and
// renders at Control Height sm.
describe("CategorySelect — in a table", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => existingCategories,
    } as Response);
  });

  function renderInTable() {
    render(
      <CacheProvider>
        <ThemeProvider theme={theme}>
          <CategorySelect onChange={vi.fn()} hideLabel size="sm" />
        </ThemeProvider>
      </CacheProvider>
    );
  }

  it("shows no visible label but keeps the accessible name", async () => {
    renderInTable();
    await screen.findByRole("option", { name: "Food" });
    expect(
      screen.getByRole("combobox", { name: "Category" })
    ).toBeInTheDocument();
    expect(document.querySelectorAll("label")).toHaveLength(0);
  });

  it("renders the select at the sm Control Height", async () => {
    renderInTable();
    await screen.findByRole("option", { name: "Food" });
    expect(
      getComputedStyle(screen.getByRole("combobox", { name: "Category" }))
        .height
    ).toBe(`${theme.sizing.control.sm}px`);
  });
});
