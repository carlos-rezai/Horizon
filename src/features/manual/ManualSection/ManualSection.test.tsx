// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { Flag } from "lucide-react";
import { theme } from "../../../tokens";
import type { ManualTopic } from "../manualTypes/manualTypes";
import ManualSection from "./ManualSection";

const TOPIC: ManualTopic = {
  id: "start",
  icon: Flag,
  title: "Getting Started",
  blurb: "A suggested order for setting Horizon up the first time.",
  details: [
    { heading: "1. Create your accounts", body: "Start with every account." },
    { heading: "2. Configure your mortgage", body: "Open the pencil icon." },
    {
      heading: "3. Add recurring transactions",
      body: "Salary, rent, savings.",
    },
  ],
};

const BLURB_ONLY: ManualTopic = { ...TOPIC, id: "settings", details: [] };

function renderSection(
  topic: ManualTopic,
  ref?: (el: HTMLElement | null) => void
) {
  return render(
    <ThemeProvider theme={theme}>
      <ManualSection topic={topic} ref={ref} />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe("ManualSection — the topic header", () => {
  it("renders the topic title as a heading", () => {
    renderSection(TOPIC);

    expect(
      screen.getByRole("heading", { name: TOPIC.title })
    ).toBeInTheDocument();
  });

  it("renders the topic's own icon", () => {
    renderSection(TOPIC);

    expect(
      screen.getByTestId("manual-topic-icon").querySelector("svg")
    ).toBeInTheDocument();
  });

  it("renders the blurb, so a reader can judge the topic without expanding anything", () => {
    renderSection(TOPIC);

    expect(screen.getByText(TOPIC.blurb)).toBeInTheDocument();
  });

  it("puts the blurb above the detail rows", () => {
    renderSection(TOPIC);

    const blurb = screen.getByText(TOPIC.blurb);
    const firstRow = screen.getByRole("button", {
      name: new RegExp(TOPIC.details[0].heading),
    });

    expect(
      blurb.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe("ManualSection — the detail rows", () => {
  it("renders one collapsible row per detail, in the order the topic declares", () => {
    renderSection(TOPIC);

    expect(
      screen.getAllByRole("button").map((button) => button.textContent)
    ).toEqual(TOPIC.details.map((detail) => detail.heading));
  });

  it("starts every row collapsed", () => {
    renderSection(TOPIC);

    screen.getAllByRole("button").forEach((button) => {
      expect(button).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("expands one row without expanding its neighbours", () => {
    renderSection(TOPIC);

    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(TOPIC.details[0].heading),
      })
    );

    expect(screen.getByText(TOPIC.details[0].body)).toBeInTheDocument();
    expect(screen.queryByText(TOPIC.details[1].body)).not.toBeInTheDocument();
  });

  it("renders a topic that has no detail rows yet as its blurb alone", () => {
    renderSection(BLURB_ONLY);

    expect(screen.getByText(BLURB_ONLY.blurb)).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("ManualSection — registration", () => {
  it("hands its own element to the ref the drawer supplies, so the rail can find it", () => {
    const registered: { current: HTMLElement | null } = { current: null };
    renderSection(TOPIC, (element) => {
      registered.current = element;
    });

    expect(registered.current).not.toBeNull();
    expect(registered.current).toHaveTextContent(TOPIC.title);
  });
});
