// @vitest-environment jsdom
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../../tokens";
import type { ManualDetail } from "../manualTypes";
import ManualDetailRow from "./ManualDetailRow";

/**
 * Fixtures rather than shipped copy: the row's two shapes — prose and term list
 * — are what is under test, and asserting against real manual sentences would
 * make every copy edit a failure here.
 */
const PROSE: ManualDetail = {
  heading: "2. Configure your mortgage",
  body: "Open the Mortgage Countdown card and fill in the original loan amount.",
};

const WITH_TERMS: ManualDetail = {
  heading: "1. Create your accounts",
  body: "Start with every account whose balance you want Horizon to track.",
  terms: [
    { term: "Girokonto", definition: "Everyday checking account." },
    { term: "Tagesgeld", definition: "Instant-access savings." },
  ],
};

function renderRow(detail: ManualDetail) {
  return render(
    <ThemeProvider theme={theme}>
      <ManualDetailRow detail={detail} />
    </ThemeProvider>
  );
}

function renderRowForCSS(detail: ManualDetail) {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>
        <ManualDetailRow detail={detail} />
      </ThemeProvider>
    </StyleSheetManager>
  );
}

/** Injected CSS for one element's own classes, whitespace removed — the same
 *  reading the drawer's motion tests take, since jsdom computes no styles. */
function getElementCSS(testId: string): string {
  const allCSS = Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n")
    .replace(/\s/g, "");

  return Array.from(screen.getByTestId(testId).classList)
    .flatMap(
      (cls) => allCSS.match(new RegExp(`\\.${cls}\\{[^}]*\\}`, "g")) ?? []
    )
    .join("");
}

function toggle(heading: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(heading) }));
}

afterEach(cleanup);

describe("ManualDetailRow — collapsed by default", () => {
  it("shows the heading, so a topic reads as a scannable list", () => {
    renderRow(PROSE);

    expect(
      screen.getByRole("button", { name: new RegExp(PROSE.heading) })
    ).toBeInTheDocument();
  });

  it("hides the body until it is asked for", () => {
    renderRow(PROSE);

    expect(screen.queryByText(PROSE.body)).not.toBeInTheDocument();
  });

  it("reports itself as collapsed", () => {
    renderRow(PROSE);

    expect(
      screen.getByRole("button", { name: new RegExp(PROSE.heading) })
    ).toHaveAttribute("aria-expanded", "false");
  });
});

describe("ManualDetailRow — expand and collapse", () => {
  it("reveals the body when the heading is clicked", () => {
    renderRow(PROSE);

    toggle(PROSE.heading);

    expect(screen.getByText(PROSE.body)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(PROSE.heading) })
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("hides the body again when the heading is clicked a second time", () => {
    renderRow(PROSE);

    toggle(PROSE.heading);
    toggle(PROSE.heading);

    expect(screen.queryByText(PROSE.body)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(PROSE.heading) })
    ).toHaveAttribute("aria-expanded", "false");
  });
});

describe("ManualDetailRow — the term list", () => {
  it("renders each term with its definition as a definition list, not a paragraph", () => {
    const { container } = renderRow(WITH_TERMS);

    toggle(WITH_TERMS.heading);

    const list = container.querySelector("dl");
    expect(list).not.toBeNull();
    WITH_TERMS.terms?.forEach(({ term, definition }) => {
      const dt = within(list as HTMLElement).getByText(term);
      expect(dt.tagName).toBe("DT");
      expect(dt.nextElementSibling?.tagName).toBe("DD");
      expect(dt.nextElementSibling).toHaveTextContent(definition);
    });
  });

  it("still renders the row's own body above the terms", () => {
    renderRow(WITH_TERMS);

    toggle(WITH_TERMS.heading);

    expect(screen.getByText(WITH_TERMS.body)).toBeInTheDocument();
  });

  it("keeps the terms hidden while the row is collapsed", () => {
    const { container } = renderRow(WITH_TERMS);

    expect(container.querySelector("dl")).toBeNull();
  });

  it("renders no definition list for a row that carries no terms", () => {
    const { container } = renderRow(PROSE);

    toggle(PROSE.heading);

    expect(container.querySelector("dl")).toBeNull();
  });
});

describe("ManualDetailRow — the chevron", () => {
  it("points right while the row is collapsed", () => {
    renderRowForCSS(PROSE);

    expect(getElementCSS("manual-row-chevron")).not.toContain("rotate(90deg)");
  });

  it("rotates down when the row opens, matching the year-accordion rows", () => {
    renderRowForCSS(PROSE);

    toggle(PROSE.heading);

    expect(getElementCSS("manual-row-chevron")).toContain("rotate(90deg)");
  });
});
