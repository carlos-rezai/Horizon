import { describe, it, expect } from "vitest";
import type { Transaction } from "../../types/transaction";
import {
  optimisticCreate,
  optimisticRemove,
  optimisticUpdate,
} from "./optimisticTransactions";

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-0",
    accountId: "acc-1",
    date: "2026-05-10",
    amount: -1000,
    description: "Expense",
    category: "Food",
    ...overrides,
  };
}

const groceries = tx({ id: "txn-1", description: "Groceries", amount: -5000 });
const fuel = tx({ id: "txn-2", description: "Fuel", amount: -7000 });
const rent = tx({ id: "txn-3", description: "Rent", amount: -90000 });

/** The row painted before the server has assigned an id. */
const provisional = tx({
  id: "provisional-1",
  description: "Coffee",
  amount: -350,
});

/** The same row as the server stored it. */
const savedCoffee = tx({ id: "txn-9", description: "Coffee", amount: -350 });

describe("optimisticCreate", () => {
  it("paints the provisional row at the end of the list", () => {
    const edit = optimisticCreate([groceries, fuel], provisional);

    expect(edit.next).toEqual([groceries, fuel, provisional]);
  });

  it("paints the provisional row onto an empty month", () => {
    const edit = optimisticCreate([], provisional);

    expect(edit.next).toEqual([provisional]);
  });

  it("rolls back to the exact list the edit started from", () => {
    const edit = optimisticCreate([groceries, fuel], provisional);

    expect(edit.rollback).toEqual([groceries, fuel]);
  });

  it("settles the provisional row onto the server row in its own position", () => {
    const edit = optimisticCreate([groceries, fuel], provisional);

    expect(edit.settle(savedCoffee)).toEqual([groceries, fuel, savedCoffee]);
  });

  it("keeps the settled list the same length as the optimistic one", () => {
    const edit = optimisticCreate([groceries, fuel], provisional);

    expect(edit.settle(savedCoffee)).toHaveLength(edit.next.length);
  });

  it("does not mutate the list it was given", () => {
    const list = [groceries, fuel];

    const edit = optimisticCreate(list, provisional);
    edit.settle(savedCoffee);

    expect(list).toEqual([groceries, fuel]);
  });
});

describe("optimisticUpdate", () => {
  it("paints the changed fields on the matching row in place", () => {
    const edit = optimisticUpdate([groceries, fuel, rent], "txn-2", {
      description: "Petrol",
      amount: -7500,
    });

    expect(edit.next).toEqual([
      groceries,
      { ...fuel, description: "Petrol", amount: -7500 },
      rent,
    ]);
  });

  it("changes nothing when the id is not in the list", () => {
    const edit = optimisticUpdate([groceries, fuel], "txn-missing", {
      description: "Petrol",
    });

    expect(edit.next).toEqual([groceries, fuel]);
  });

  it("rolls back to the exact list the edit started from", () => {
    const edit = optimisticUpdate([groceries, fuel, rent], "txn-2", {
      description: "Petrol",
      amount: -7500,
    });

    expect(edit.rollback).toEqual([groceries, fuel, rent]);
  });

  it("settles onto the server's canonical row in place", () => {
    const stored = { ...fuel, description: "Petrol", amount: -7499 };

    const edit = optimisticUpdate([groceries, fuel, rent], "txn-2", {
      description: "Petrol",
      amount: -7500,
    });

    expect(edit.settle(stored)).toEqual([groceries, stored, rent]);
  });

  it("does not mutate the list it was given", () => {
    const list = [groceries, fuel];

    const edit = optimisticUpdate(list, "txn-2", { description: "Petrol" });
    edit.settle({ ...fuel, description: "Petrol" });

    expect(list).toEqual([groceries, fuel]);
  });
});

describe("optimisticRemove", () => {
  it("drops the matching row immediately", () => {
    const edit = optimisticRemove([groceries, fuel, rent], "txn-2");

    expect(edit.next).toEqual([groceries, rent]);
  });

  it("changes nothing when the id is not in the list", () => {
    const edit = optimisticRemove([groceries, fuel], "txn-missing");

    expect(edit.next).toEqual([groceries, fuel]);
  });

  it("rolls back to the exact list the edit started from, in its original order", () => {
    const edit = optimisticRemove([groceries, fuel, rent], "txn-2");

    expect(edit.rollback).toEqual([groceries, fuel, rent]);
  });

  it("leaves the list as it is when the delete settles", () => {
    const edit = optimisticRemove([groceries, fuel, rent], "txn-2");

    expect(edit.settle(fuel)).toEqual([groceries, rent]);
  });

  it("does not mutate the list it was given", () => {
    const list = [groceries, fuel, rent];

    const edit = optimisticRemove(list, "txn-2");
    edit.settle(fuel);

    expect(list).toEqual([groceries, fuel, rent]);
  });
});
