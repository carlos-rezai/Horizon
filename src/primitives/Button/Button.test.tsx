// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import Button from "./Button";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Button — unit", () => {
  it("renders without error for the primary variant", () => {
    renderWithTheme(<Button variant="primary">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders without error for the secondary variant", () => {
    renderWithTheme(<Button variant="secondary">Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders without error for the danger variant", () => {
    renderWithTheme(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });

  it("renders without error when no variant is supplied (defaults to primary)", () => {
    renderWithTheme(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("forwards the type attribute to the underlying button element", () => {
    renderWithTheme(<Button type="submit">Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute(
      "type",
      "submit"
    );
  });

  it("forwards the disabled attribute to the underlying button element", () => {
    renderWithTheme(<Button disabled>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("forwards arbitrary HTML attributes such as aria-label", () => {
    renderWithTheme(<Button aria-label="Close dialog">×</Button>);
    expect(
      screen.getByRole("button", { name: "Close dialog" })
    ).toBeInTheDocument();
  });

  it("renders as a focusable element with button role", () => {
    renderWithTheme(<Button>Focus me</Button>);
    const btn = screen.getByRole("button", { name: "Focus me" });
    expect(btn.tagName.toLowerCase()).toBe("button");
    expect(btn).not.toHaveAttribute("tabindex", "-1");
  });
});

describe("Button — interaction", () => {
  it("fires onClick when clicked and not disabled", () => {
    const onClick = vi.fn();
    renderWithTheme(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when the button is disabled", () => {
    const onClick = vi.fn();
    renderWithTheme(
      <Button disabled onClick={onClick}>
        Click
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

function renderForCSS(ui: React.ReactElement) {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </StyleSheetManager>
  );
}

function getInjectedCSS(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");
}

describe("Button — styles", () => {
  it("primary variant uses primaryContainer as background color", () => {
    renderForCSS(<Button variant="primary">Save</Button>);
    expect(getInjectedCSS()).toContain(theme.colors.primaryContainer);
  });

  it("all variants use 'all 0.2s ease' base transition", () => {
    renderForCSS(<Button variant="primary">Save</Button>);
    expect(getInjectedCSS()).toContain("all 0.2s ease");
  });

  it("secondary variant uses transparent background color", () => {
    renderForCSS(<Button variant="secondary">Cancel</Button>);
    expect(getInjectedCSS()).toContain("background-color:transparent");
  });

  it("secondary variant uses outlineVariant as border color", () => {
    renderForCSS(<Button variant="secondary">Cancel</Button>);
    expect(getInjectedCSS()).toContain(theme.colors.outlineVariant);
  });
});
