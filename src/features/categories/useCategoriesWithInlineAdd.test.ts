// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCategoriesWithInlineAdd } from "./useCategoriesWithInlineAdd";
import type { Category } from "../../types/category";

const existingCategories: Category[] = [
  { id: "cat-1", name: "Food", isDefault: true },
  { id: "cat-2", name: "Income", isDefault: false },
];

const newCategory: Category = {
  id: "cat-3",
  name: "Transport",
  isDefault: false,
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => existingCategories,
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCategoriesWithInlineAdd — initial fetch", () => {
  it("returns the list of categories after loading", async () => {
    const { result } = renderHook(() => useCategoriesWithInlineAdd());

    await act(async () => {});

    expect(result.current.categories).toEqual(existingCategories);
  });

  it("selectedCategoryId equals initialId synchronously on first render when initialId is provided", () => {
    const { result } = renderHook(() => useCategoriesWithInlineAdd("cat-2"));

    expect(result.current.selectedCategoryId).toBe("cat-2");
  });
});

describe("useCategoriesWithInlineAdd — addCategory", () => {
  it("calls POST /categories with the category name", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingCategories,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newCategory,
      } as Response);

    const { result } = renderHook(() => useCategoriesWithInlineAdd());
    await act(async () => {});

    await act(async () => {
      await result.current.addCategory("Transport");
    });

    const calls = vi.mocked(fetch).mock.calls;
    const postCall = calls.find(
      ([url, init]) =>
        typeof url === "string" &&
        url.includes("/categories") &&
        (init as RequestInit)?.method === "POST"
    );

    expect(postCall).toBeDefined();
    const body = JSON.parse((postCall![1] as RequestInit).body as string);
    expect(body.name).toBe("Transport");
  });

  it("appends the new category to the list after a successful add", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingCategories,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newCategory,
      } as Response);

    const { result } = renderHook(() => useCategoriesWithInlineAdd());
    await act(async () => {});

    await act(async () => {
      await result.current.addCategory("Transport");
    });

    expect(result.current.categories).toContainEqual(newCategory);
  });

  it("auto-selects the new category after a successful add", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingCategories,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newCategory,
      } as Response);

    const { result } = renderHook(() => useCategoriesWithInlineAdd());
    await act(async () => {});

    await act(async () => {
      await result.current.addCategory("Transport");
    });

    expect(result.current.selectedCategoryId).toBe(newCategory.id);
  });

  it("throws when the server returns an error", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => existingCategories,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Category already exists" }),
      } as Response);

    const { result } = renderHook(() => useCategoriesWithInlineAdd());
    await act(async () => {});

    await expect(
      act(async () => {
        await result.current.addCategory("Food");
      })
    ).rejects.toThrow();
  });
});
