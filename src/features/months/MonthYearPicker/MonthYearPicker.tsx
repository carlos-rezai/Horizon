import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { formatMonthLong, MONTHS } from "../../../utils/format/format";
import {
  deriveMonthPickerBounds,
  buildMonthGrid,
} from "../../../utils/monthPickerBounds/monthPickerBounds";
import {
  StyledAnchor,
  StyledTrigger,
  StyledChevron,
  StyledPopover,
  StyledYearHeader,
  StyledYearButton,
  StyledYearLabel,
  StyledGrid,
  StyledMonthCell,
} from "./MonthYearPicker.styles";

interface Props {
  /** The currently displayed month, "YYYY-MM". */
  month: string;
  /** Start dates of every import, used to derive the earliest browsable month. */
  importStartDates: string[];
  /** Called with the selected "YYYY-MM" when an in-range month is chosen. */
  onJump: (month: string) => void;
}

interface Position {
  top: number;
  left: number;
}

export default function MonthYearPicker({
  month,
  importStartDates,
  onJump,
}: Props) {
  const [selectedYear] = month.split("-").map(Number);
  const selectedMonthIndex = Number(month.split("-")[1]) - 1;

  const bounds = deriveMonthPickerBounds(importStartDates, month);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selectedYear);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function toggleOpen() {
    // Always (re)open on the currently displayed month's year.
    if (!open) setViewYear(selectedYear);
    setOpen((prev) => !prev);
  }

  // Anchor the fixed-position popover to the trigger, repositioning on
  // scroll/resize rather than dismissing.
  useEffect(() => {
    if (!open) return;

    const reposition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, left: rect.left });
    };

    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  // Dismiss on outside click and Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const grid = buildMonthGrid(bounds, viewYear);
  const canPrevYear = viewYear - 1 >= bounds.minYear;
  const canNextYear = viewYear + 1 <= bounds.maxYear;

  function handleSelect(monthIndex: number) {
    const value = `${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`;
    onJump(value);
    setOpen(false);
  }

  return (
    <StyledAnchor>
      <StyledTrigger ref={triggerRef} type="button" onClick={toggleOpen}>
        <span>{formatMonthLong(month)}</span>
        <StyledChevron>
          <ChevronDown size={14} aria-hidden="true" />
        </StyledChevron>
      </StyledTrigger>

      {open &&
        position &&
        createPortal(
          <StyledPopover
            ref={popoverRef}
            style={{ top: position.top, left: position.left }}
          >
            <StyledYearHeader>
              <StyledYearButton
                type="button"
                aria-label="Previous year"
                disabled={!canPrevYear}
                onClick={() => setViewYear((year) => year - 1)}
              >
                <ArrowLeft size={15} aria-hidden="true" />
              </StyledYearButton>
              <StyledYearLabel>{viewYear}</StyledYearLabel>
              <StyledYearButton
                type="button"
                aria-label="Next year"
                disabled={!canNextYear}
                onClick={() => setViewYear((year) => year + 1)}
              >
                <ArrowRight size={15} aria-hidden="true" />
              </StyledYearButton>
            </StyledYearHeader>

            <StyledGrid>
              {MONTHS.map((label, monthIndex) => (
                <StyledMonthCell
                  key={label}
                  type="button"
                  $active={
                    viewYear === selectedYear &&
                    monthIndex === selectedMonthIndex
                  }
                  disabled={!grid[monthIndex]}
                  onClick={() => handleSelect(monthIndex)}
                >
                  {label}
                </StyledMonthCell>
              ))}
            </StyledGrid>
          </StyledPopover>,
          document.body
        )}
    </StyledAnchor>
  );
}
