// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useCreateCategory, withAdded } from "./useCreateCategory";
import { useCategories } from "../useCategories/useCategories";
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import type { Category } from "../../../types/category";

const existingCategories: Category[] = [
  {
    id: "cat-1",
    name: "Food",
    isDefault: true,
    color: "#74C29B",
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

/**
 * Categories API double: the GETs before the POST answer `existingCategories`;
 * every GET after it stays in flight, the window a real refetch opens. The
 * POST answers `post`.
 */
function mockCategoryApi(post: () => Promise<Response>) {
  let posted = false;
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation((_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        posted = true;
        return post();
      }
      if (posted) return new Promise<Response>(() => undefined);
      return Promise.resolve({
        ok: true,
        json: async () => existingCategories,
      } as Response);
    });
}

const created = () =>
  Promise.resolve({ ok: true, json: async () => newCategory } as Response);

/** A `useCreateCategory` plus a read-only `useCategories` reader, under one cache. */
function renderCreateWithReader() {
  return renderHook(() => ({ ...useCreateCategory(), ...useCategories() }), {
    wrapper: CacheProvider,
  });
}

const getCalls = (spy: ReturnType<typeof mockCategoryApi>) =>
  spy.mock.calls.filter(([, init]) => (init?.method ?? "GET") === "GET");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCreateCategory", () => {
  it("POSTs the name, and the colour when one is given", async () => {
    const spy = mockCategoryApi(created);
    const { result } = renderCreateWithReader();
    await act(async () => {});

    await act(async () => {
      await result.current.create({ name: "Transport" });
    });
    await act(async () => {
      await result.current.create({ name: "Transport", color: "#E0A86B" });
    });

    const bodies = spy.mock.calls
      .filter(([, init]) => init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init?.body)) as unknown);
    expect(bodies).toEqual([
      { name: "Transport" },
      { name: "Transport", color: "#E0A86B" },
    ]);
  });

  it("resolves to the created category", async () => {
    mockCategoryApi(created);
    const { result } = renderCreateWithReader();
    await act(async () => {});

    let outcome: Awaited<ReturnType<typeof result.current.create>> | undefined;
    await act(async () => {
      outcome = await result.current.create({ name: "Transport" });
    });

    expect(outcome).toEqual({ ok: true, category: newCategory });
  });

  it("publishes the category to a useCategories reader before any refetch answers", async () => {
    mockCategoryApi(created);
    const { result } = renderCreateWithReader();
    await act(async () => {});
    expect(result.current.categories).toEqual(existingCategories);

    await act(async () => {
      await result.current.create({ name: "Transport" });
    });

    expect(result.current.categories).toEqual([
      ...existingCategories,
      newCategory,
    ]);
  });

  it("bumps the category list so the server's list reconciles it", async () => {
    const spy = mockCategoryApi(created);
    const { result } = renderCreateWithReader();
    await act(async () => {});
    const before = getCalls(spy).length;

    await act(async () => {
      await result.current.create({ name: "Transport" });
    });

    expect(getCalls(spy).length).toBe(before + 1);
  });

  it("resolves to the server's error message on failure, publishing nothing", async () => {
    mockCategoryApi(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({ error: "Category already exists" }),
      } as Response)
    );
    const { result } = renderCreateWithReader();
    await act(async () => {});

    let outcome: Awaited<ReturnType<typeof result.current.create>> | undefined;
    await act(async () => {
      outcome = await result.current.create({ name: "Food" });
    });

    expect(outcome).toEqual({ ok: false, error: "Category already exists" });
    expect(result.current.categories).toEqual(existingCategories);
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    mockCategoryApi(() =>
      Promise.resolve({
        ok: false,
        json: async () => {
          throw new SyntaxError("Unexpected token <");
        },
      } as unknown as Response)
    );
    const { result } = renderCreateWithReader();
    await act(async () => {});

    let outcome: Awaited<ReturnType<typeof result.current.create>> | undefined;
    await act(async () => {
      outcome = await result.current.create({ name: "Food" });
    });

    expect(outcome).toEqual({ ok: false, error: "Failed to create category" });
  });
});

describe("withAdded", () => {
  it("appends only the categories the list does not hold, keeping identity when none are new", () => {
    expect(withAdded(existingCategories, [newCategory])).toEqual([
      ...existingCategories,
      newCategory,
    ]);
    expect(withAdded(existingCategories, existingCategories)).toBe(
      existingCategories
    );
  });
});
