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
import type { AccountWithBalance } from "../../../types/account";
import MortgageSetupModal from "./MortgageSetupModal";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const created: AccountWithBalance = {
  id: "m-new",
  kind: "Mortgage",
  name: "Haus",
  openingBalance: 20000000,
  openingDate: "2026-10-16",
  balance: 20000000,
  originalPrincipal: 40000000,
  startDate: "2020-06-01",
  termYears: 25,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    status: 201,
    json: async () => ({ ...created }),
  } as Response);
});

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Today as the DatePicker displays it (dd.MM.yyyy) and as ISO. */
function today(): { display: string; iso: string } {
  const d = new Date();
  return {
    display: `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`,
    iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  };
}

function renderModal(
  props: Partial<React.ComponentProps<typeof MortgageSetupModal>> = {}
) {
  return renderWithTheme(
    <MortgageSetupModal onClose={vi.fn()} onSuccess={vi.fn()} {...props} />
  );
}

const nameInput = () => screen.getByLabelText(/^name$/i);
const restschuldInput = () => screen.getByLabelText(/restschuld today/i);
const asOfInput = () => screen.getByLabelText(/^as of$/i);
const principalInput = () => screen.getByLabelText(/original principal/i);
const startDateInput = () => screen.getByLabelText(/^start date$/i);
const termInput = () => screen.getByLabelText(/term/i);

/** Fill every Mortgage and Origination field with a valid setup:
 *  200,000 € Restschuld as of 16.10.2026, originated at 400,000 € in June 2020
 *  over 25 years. Overrides are typed values, as the user would type them. */
function fillValid(
  overrides: Partial<{
    name: string;
    restschuld: string;
    asOf: string;
    principal: string;
    startDate: string;
    term: string;
  }> = {}
) {
  const v = {
    name: "Haus",
    restschuld: "200000",
    asOf: "16.10.2026",
    principal: "400000",
    startDate: "01.06.2020",
    term: "25",
    ...overrides,
  };
  fireEvent.change(nameInput(), { target: { value: v.name } });
  fireEvent.change(restschuldInput(), { target: { value: v.restschuld } });
  fireEvent.change(asOfInput(), { target: { value: v.asOf } });
  fireEvent.change(principalInput(), { target: { value: v.principal } });
  fireEvent.change(startDateInput(), { target: { value: v.startDate } });
  fireEvent.change(termInput(), { target: { value: v.term } });
}

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: /save/i }));

describe("MortgageSetupModal — one form", () => {
  it("renders the Mortgage and Origination fields together, with no wizard steps", () => {
    renderModal();

    expect(nameInput()).toBeInTheDocument();
    expect(restschuldInput()).toBeInTheDocument();
    expect(asOfInput()).toBeInTheDocument();
    expect(principalInput()).toBeInTheDocument();
    expect(startDateInput()).toBeInTheDocument();
    expect(termInput()).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /next/i })
    ).not.toBeInTheDocument();
  });

  it("shows the Repayment group as the add-a-Girokonto note", () => {
    renderModal();

    expect(
      screen.getByText("Add a Girokonto to set up the monthly repayment.")
    ).toBeInTheDocument();
  });
});

describe("MortgageSetupModal — default values", () => {
  it('defaults the name to "Mortgage"', () => {
    renderModal();

    expect(nameInput()).toHaveValue("Mortgage");
  });

  it("defaults the as-of date to today", () => {
    renderModal();

    expect(asOfInput()).toHaveValue(today().display);
  });

  it("submits today as the opening date when as of is left at its default", async () => {
    renderModal();
    fireEvent.change(restschuldInput(), { target: { value: "200000" } });
    fireEvent.change(principalInput(), { target: { value: "400000" } });
    fireEvent.change(startDateInput(), { target: { value: "01.06.2020" } });
    fireEvent.change(termInput(), { target: { value: "25" } });
    save();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.name).toBe("Mortgage");
    expect(body.openingDate).toBe(today().iso);
  });
});

describe("MortgageSetupModal — field rules", () => {
  it.each([
    ["the name is empty", { name: "" }],
    ["the Restschuld is zero", { restschuld: "0" }],
    ["the Restschuld is negative", { restschuld: "-5" }],
    ["the Restschuld is empty", { restschuld: "" }],
    ["the original principal is below the Restschuld", { principal: "150000" }],
    ["the original principal is empty", { principal: "" }],
    ["the start date is after the as-of date", { startDate: "17.10.2026" }],
    ["the term is 0 years", { term: "0" }],
    ["the term is 41 years", { term: "41" }],
    ["the term is not a whole number of years", { term: "2.5" }],
    ["the term is empty", { term: "" }],
  ])("blocks saving and explains why when %s", async (_label, overrides) => {
    const onSuccess = vi.fn();
    renderModal({ onSuccess });
    fillValid(overrides);
    save();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("accepts the boundary values: principal equal to Restschuld, start on the as-of date, a 40-year term", async () => {
    renderModal();
    fillValid({
      principal: "200000",
      startDate: "16.10.2026",
      term: "40",
    });
    save();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("accepts a 1-year term", async () => {
    renderModal();
    fillValid({ term: "1" });
    save();

    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});

describe("MortgageSetupModal — payload", () => {
  it("POSTs /mortgages with the account and origination in cents and ISO dates, then hands back the created account", async () => {
    const onSuccess = vi.fn();
    renderModal({ onSuccess });
    fillValid();
    save();

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [url, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/mortgages$/);
    expect((init as RequestInit).method).toBe("POST");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      name: "Haus",
      openingBalance: 20000000,
      openingDate: "2026-10-16",
      originalPrincipal: 40000000,
      startDate: "2020-06-01",
      termYears: 25,
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(created));
  });

  it("shows the server's validation issues and stays open when the save is refused", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        issues: [{ path: ["termYears"], message: "Term must be 1–40 years" }],
      }),
    } as Response);
    const onSuccess = vi.fn();
    renderModal({ onSuccess });
    fillValid();
    save();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("calls onClose when cancelled, without saving", () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("MortgageSetupModal — live % paid off preview", () => {
  it("derives the preview from the original principal and the Restschuld", () => {
    renderModal();
    fillValid({ restschuld: "200000", principal: "400000" });

    expect(screen.getByText(/50\s*% paid off/)).toBeInTheDocument();
  });

  it("updates the preview as the principal and the Restschuld change", () => {
    renderModal();
    fillValid({ restschuld: "200000", principal: "400000" });

    fireEvent.change(principalInput(), { target: { value: "800000" } });
    expect(screen.getByText(/75\s*% paid off/)).toBeInTheDocument();

    fireEvent.change(restschuldInput(), { target: { value: "400000" } });
    expect(screen.getByText(/50\s*% paid off/)).toBeInTheDocument();
  });
});

// Live-Use Repair #2 (issue #227): the Repayment group gets real fields
// whenever a Girokonto or Tagesgeld exists, so one save ends with a working
// payoff date.
describe("MortgageSetupModal — Repayment", () => {
  const giro: AccountWithBalance = {
    id: "giro-1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 500000,
    openingDate: "2026-01-01",
    balance: 500000,
  };
  const tagesgeld: AccountWithBalance = {
    id: "tg-1",
    kind: "Tagesgeld",
    name: "Reserve",
    openingBalance: 1000000,
    openingDate: "2026-01-01",
    balance: 1000000,
  };
  const card: AccountWithBalance = {
    id: "cc-1",
    kind: "CreditCard",
    name: "Visa",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  };
  const depot: AccountWithBalance = {
    id: "inv-1",
    kind: "Investment",
    name: "Depot",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  };

  const NOTE = "Add a Girokonto to set up the monthly repayment.";
  const paidFromSelect = () =>
    screen.getByLabelText(/paid from/i) as HTMLSelectElement;
  const monthlyRateInput = () => screen.getByLabelText(/monthly rate/i);
  const stAmountInput = () => screen.getByLabelText(/annual sondertilgung/i);
  const stMonthSelect = () =>
    screen.getByLabelText(/^in month$/i) as HTMLSelectElement;

  function fillRepayment(
    overrides: Partial<{
      paidFrom: string;
      rate: string;
      stAmount: string;
      stMonth: string;
    }> = {}
  ) {
    const v = { paidFrom: "giro-1", rate: "1500", ...overrides };
    fireEvent.change(paidFromSelect(), { target: { value: v.paidFrom } });
    fireEvent.change(monthlyRateInput(), { target: { value: v.rate } });
    if (v.stAmount !== undefined) {
      fireEvent.change(stAmountInput(), { target: { value: v.stAmount } });
    }
    if (v.stMonth !== undefined) {
      fireEvent.change(stMonthSelect(), { target: { value: v.stMonth } });
    }
  }

  async function postedBody(): Promise<Record<string, unknown>> {
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    return JSON.parse((init as RequestInit).body as string) as Record<
      string,
      unknown
    >;
  }

  describe("fields", () => {
    it("shows the repayment fields instead of the note when a Girokonto exists", () => {
      renderModal({ accounts: [giro] });

      expect(paidFromSelect()).toBeInTheDocument();
      expect(monthlyRateInput()).toBeInTheDocument();
      expect(stAmountInput()).toBeInTheDocument();
      expect(stMonthSelect()).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /increment/i })
      ).toBeInTheDocument();
      expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
    });

    it("shows the repayment fields when only a Tagesgeld exists", () => {
      renderModal({ accounts: [tagesgeld] });

      expect(paidFromSelect()).toBeInTheDocument();
      expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
    });

    it("offers only the Girokonto and Tagesgeld accounts under Paid from", () => {
      renderModal({ accounts: [giro, card, tagesgeld, depot] });

      const offered = Array.from(paidFromSelect().options)
        .map((o) => o.value)
        .filter((v) => v !== "");
      expect(offered).toEqual(["giro-1", "tg-1"]);
    });
  });

  describe("no paid-from account", () => {
    it("keeps the add-a-Girokonto note when no account can fund the repayment", () => {
      renderModal({ accounts: [card, depot] });

      expect(screen.getByText(NOTE)).toBeInTheDocument();
      expect(screen.queryByLabelText(/paid from/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/monthly rate/i)).not.toBeInTheDocument();
    });

    it("still creates the mortgage, with no repayment in the payload", async () => {
      const onSuccess = vi.fn();
      renderModal({ accounts: [card], onSuccess });
      fillValid();
      save();

      const body = await postedBody();
      expect(body.repayment).toBeUndefined();
      await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(created));
    });
  });

  describe("defaults", () => {
    it("defaults the day of month to 1", () => {
      renderModal({ accounts: [giro] });

      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("defaults the Sondertilgung month to November", () => {
      renderModal({ accounts: [giro] });

      expect(stMonthSelect().value).toBe("11");
    });

    it("submits day 1 and November when they are left at their defaults", async () => {
      renderModal({ accounts: [giro] });
      fillValid();
      fillRepayment({ stAmount: "5000" });
      save();

      const body = await postedBody();
      expect(body.repayment).toMatchObject({
        dayOfMonth: 1,
        sondertilgungMonth: 11,
      });
    });

    it("keeps the day of month within 1–31 on the Stepper", async () => {
      renderModal({ accounts: [giro] });
      fireEvent.click(screen.getByRole("button", { name: /decrement/i }));
      fillValid();
      fillRepayment();
      save();

      const body = await postedBody();
      expect(body.repayment).toMatchObject({ dayOfMonth: 1 });
    });
  });

  describe("field rules", () => {
    it.each([
      ["the monthly rate is zero", { rate: "0" }],
      ["the monthly rate is negative", { rate: "-1500" }],
      ["the Sondertilgung amount is zero", { stAmount: "0" }],
      ["the Sondertilgung amount is negative", { stAmount: "-5000" }],
      [
        "a Sondertilgung amount is given without its month",
        { stAmount: "5000", stMonth: "" },
      ],
    ])("blocks saving and explains why when %s", async (_label, overrides) => {
      const onSuccess = vi.fn();
      renderModal({ accounts: [giro], onSuccess });
      fillValid();
      fillRepayment(overrides);
      save();

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("does not require a Sondertilgung month when no Sondertilgung amount is given", async () => {
      renderModal({ accounts: [giro] });
      fillValid();
      fillRepayment({ stMonth: "" });
      save();

      const body = await postedBody();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(body.repayment).toBeDefined();
    });
  });

  describe("payload", () => {
    it("sends the monthly repayment in cents from the chosen account, with the day of month", async () => {
      renderModal({ accounts: [giro, tagesgeld] });
      fireEvent.click(screen.getByRole("button", { name: /increment/i }));
      fireEvent.click(screen.getByRole("button", { name: /increment/i }));
      fillValid();
      fillRepayment({ paidFrom: "tg-1", rate: "1500" });
      save();

      const body = await postedBody();
      expect(body).toMatchObject({
        name: "Haus",
        openingBalance: 20000000,
        originalPrincipal: 40000000,
        termYears: 25,
      });
      expect(body.repayment).toEqual({
        paidFromAccountId: "tg-1",
        monthlyAmount: 150000,
        dayOfMonth: 3,
      });
    });

    it("adds the annual Sondertilgung and its month when an amount is given", async () => {
      renderModal({ accounts: [giro] });
      fillValid();
      fillRepayment({ rate: "1500", stAmount: "5000", stMonth: "3" });
      save();

      const body = await postedBody();
      expect(body.repayment).toEqual({
        paidFromAccountId: "giro-1",
        monthlyAmount: 150000,
        dayOfMonth: 1,
        sondertilgungAmount: 500000,
        sondertilgungMonth: 3,
      });
    });
  });
});
