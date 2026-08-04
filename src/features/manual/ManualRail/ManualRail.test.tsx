// @vitest-environment jsdom
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { BookOpen, Calendar, Wallet } from "lucide-react";
import { theme } from "../../../tokens";
import type {
  ManualGroup,
  ManualTopicId,
  ManualTopicRecord,
} from "../manualTypes/manualTypes";
import ManualRail from "./ManualRail";

/**
 * A small fixture rather than the real manual: the rail's job is to render
 * whatever groups and topics it is handed, so tying these assertions to the
 * shipping copy would only make them break when the copy changes.
 */
const GROUPS: ManualGroup[] = [
  { label: "Getting started", topicIds: ["start"] },
  { label: "Day to day", topicIds: ["month", "accounts"] },
];

const TOPICS = {
  start: {
    id: "start",
    icon: BookOpen,
    title: "First steps",
    blurb: "",
    details: [],
  },
  month: {
    id: "month",
    icon: Calendar,
    title: "Month Overview",
    blurb: "",
    details: [],
  },
  accounts: {
    id: "accounts",
    icon: Wallet,
    title: "Accounts",
    blurb: "",
    details: [],
  },
} as unknown as ManualTopicRecord;

const TITLES_IN_ORDER = ["First steps", "Month Overview", "Accounts"];

function renderRail({
  activeTopicId = "start" as ManualTopicId,
  onJumpTo = vi.fn(),
} = {}) {
  render(
    <ThemeProvider theme={theme}>
      <ManualRail
        groups={GROUPS}
        topics={TOPICS}
        activeTopicId={activeTopicId}
        onJumpTo={onJumpTo}
      />
    </ThemeProvider>
  );

  return { onJumpTo };
}

function rail(): HTMLElement {
  return screen.getByRole("navigation", { name: /manual topics/i });
}

afterEach(() => {
  cleanup();
});

describe("ManualRail — contents", () => {
  it("renders every group label in the order it was given", () => {
    renderRail();

    expect(
      screen.getAllByTestId("manual-group-label").map((el) => el.textContent)
    ).toEqual(GROUPS.map((group) => group.label));
  });

  it("lists every topic under its group, in index order", () => {
    renderRail();

    expect(
      within(rail())
        .getAllByRole("button")
        .map((button) => button.textContent)
    ).toEqual(TITLES_IN_ORDER);
  });

  it("renders each entry's own icon", () => {
    renderRail();

    within(rail())
      .getAllByRole("button")
      .forEach((entry) => {
        expect(entry.querySelector("svg")).toBeInTheDocument();
      });
  });
});

describe("ManualRail — the active entry", () => {
  it("marks the active topic as current", () => {
    renderRail({ activeTopicId: "month" });

    expect(
      within(rail()).getByRole("button", { name: "Month Overview" })
    ).toHaveAttribute("aria-current", "true");
  });

  it("marks exactly one entry at a time", () => {
    renderRail({ activeTopicId: "month" });

    const current = within(rail())
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-current") === "true");
    expect(current).toHaveLength(1);
  });

  it("leaves the other entries unmarked", () => {
    renderRail({ activeTopicId: "month" });

    expect(
      within(rail()).getByRole("button", { name: "Accounts" })
    ).not.toHaveAttribute("aria-current");
  });
});

describe("ManualRail — navigating", () => {
  it("calls back with the topic id of the entry that was clicked", () => {
    const { onJumpTo } = renderRail();

    fireEvent.click(
      within(rail()).getByRole("button", { name: "Month Overview" })
    );

    expect(onJumpTo).toHaveBeenCalledTimes(1);
    expect(onJumpTo).toHaveBeenCalledWith("month");
  });

  it("navigates rather than routing — the entries are buttons, not links", () => {
    renderRail();

    expect(within(rail()).queryAllByRole("link")).toHaveLength(0);
  });
});
