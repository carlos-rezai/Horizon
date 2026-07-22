import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  StyledTabsRoot,
  StyledTabList,
  StyledScrollButton,
  StyledTab,
  StyledDot,
  StyledCount,
} from "./Tabs.styles";

export interface TabItem {
  id: string;
  label: string;
  /** Optional colour dot rendered before the label. */
  color?: string;
  /** Optional count rendered after the label. */
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export default function Tabs({ tabs, activeId, onChange }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Recompute which chevrons to show from the strip's scroll position.
  const updateAffordances = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  // Everything about a tab that can change the strip's width. Call sites build
  // the tabs array fresh on every render, so keying the effect on the array
  // itself re-measures inside every commit — a forced synchronous layout per
  // render. A signature re-measures only when the strip can actually have
  // resized.
  const tabsSignature = tabs
    .map((tab) => [tab.id, tab.label, tab.count, tab.color].join(":"))
    .join("|");

  useEffect(() => {
    updateAffordances();
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateAffordances);
    observer.observe(el);
    return () => observer.disconnect();
    // Re-measure when the tab set changes (e.g. accounts added/removed).
  }, [updateAffordances, tabsSignature]);

  const page = (direction: -1 | 1) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.75,
      behavior: "smooth",
    });
  };

  return (
    <StyledTabsRoot>
      {canScrollLeft && (
        <StyledScrollButton
          type="button"
          $side="left"
          aria-label="Scroll tabs left"
          onClick={() => page(-1)}
        >
          <ChevronLeft size={16} />
        </StyledScrollButton>
      )}

      <StyledTabList role="tablist" ref={listRef} onScroll={updateAffordances}>
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          return (
            <StyledTab
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              $active={active}
              $color={tab.color}
              onClick={() => onChange(tab.id)}
            >
              {tab.color ? <StyledDot $color={tab.color} /> : null}
              <span>{tab.label}</span>
              {tab.count !== undefined ? (
                <StyledCount>{tab.count}</StyledCount>
              ) : null}
            </StyledTab>
          );
        })}
      </StyledTabList>

      {canScrollRight && (
        <StyledScrollButton
          type="button"
          $side="right"
          aria-label="Scroll tabs right"
          onClick={() => page(1)}
        >
          <ChevronRight size={16} />
        </StyledScrollButton>
      )}
    </StyledTabsRoot>
  );
}
