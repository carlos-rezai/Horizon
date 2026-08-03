import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { BookOpen, X } from "lucide-react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import ManualSection from "../ManualSection/ManualSection";
import { MANUAL_GROUPS, MANUAL_TOPICS } from "../manualContent";
import { MANUAL_TOPICS_IN_ORDER } from "../manualIndex";
import type { ManualTopicId } from "../manualTypes";
import { useManualScrollSpy } from "../useManualScrollSpy";
import {
  StyledOverlay,
  StyledBackdrop,
  StyledPanel,
  StyledHeader,
  StyledIdentity,
  StyledHeaderIcon,
  StyledTitle,
  StyledSubtitle,
  StyledClose,
  StyledColumns,
  StyledRail,
  StyledGroup,
  StyledGroupLabel,
  StyledRailEntry,
  StyledPane,
} from "./ManualDrawer.styles";

/** Document order, fixed once at module load — the spy compares scroll offsets
 *  against it, so it must not be rebuilt on every render. */
const MANUAL_TOPIC_ORDER: ManualTopicId[] = MANUAL_TOPICS_IN_ORDER.map(
  (topic) => topic.id
);

/** Everything the drawer's own markup can put a keyboard on. The panel itself
 *  is excluded by its `tabindex="-1"`, so it never joins the ring it bounds. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ManualDrawerProps {
  /** Drives the enter and exit transitions. Mounting belongs to the caller,
   *  which keeps the drawer in the tree until the exit has finished. */
  open: boolean;
  onClose: () => void;
  /** Where focus goes on close when nothing in the page opened the drawer —
   *  the Electron Help menu leaves the keyboard outside the window entirely,
   *  so there is no trigger to hand it back to. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * The manual's slide-over shell: a grouped table of contents on the left and
 * every topic, all at once, on the right. The rail navigates — it never routes,
 * so nothing is unmounted by clicking it and a reader can always scroll on past
 * the topic they arrived at.
 *
 * The panel reports its own motion state — `data-state` for the transition and
 * `data-motion` for whether there is one at all — since the animation itself is
 * unobservable in tests.
 *
 * While it is open the drawer owns the keyboard: focus moves onto the panel,
 * Tab cycles within it, and closing hands the position back to wherever it came
 * from.
 */
export default function ManualDrawer({
  open,
  onClose,
  returnFocusRef,
}: ManualDrawerProps) {
  const reduced = useReducedMotion();
  const { activeTopicId, paneRef, registerSection, jumpTo } =
    useManualScrollSpy(MANUAL_TOPIC_ORDER);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Takes the keyboard on open and gives it back the moment `open` flips, not
  // when the drawer finally leaves the tree — a reader must not have to wait
  // out the exit transition to carry on where they were.
  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement;
    restoreRef.current =
      previous instanceof HTMLElement && previous !== document.body
        ? previous
        : null;
    panelRef.current?.focus();

    return () => {
      const restore = restoreRef.current;
      // Reading the fallback here, in the cleanup, is the point: it has to be
      // whatever is on screen when the drawer closes, not what was there when
      // it opened.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const fallback = returnFocusRef?.current ?? null;
      const target = restore?.isConnected ? restore : fallback;
      target?.focus();
    };
  }, [open, returnFocusRef]);

  // The browser already knows how to walk a tab ring; this only closes it, at
  // the two edges where the next stop would be the screen behind the backdrop.
  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const panel = panelRef.current;
    if (!panel) return;

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE)
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <StyledOverlay>
      <StyledBackdrop data-testid="manual-backdrop" onClick={onClose} />
      <StyledPanel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="User Manual"
        tabIndex={-1}
        onKeyDown={trapTab}
        data-testid="manual-panel"
        data-state={open ? "open" : "closed"}
        data-motion={reduced ? "none" : "slide"}
        $open={open}
        $slide={!reduced}
      >
        <StyledHeader>
          <StyledIdentity>
            <StyledHeaderIcon>
              <BookOpen size={18} />
            </StyledHeaderIcon>
            <div>
              <StyledTitle>User Manual</StyledTitle>
              <StyledSubtitle>How to use Horizon</StyledSubtitle>
            </div>
          </StyledIdentity>
          <StyledClose
            type="button"
            aria-label="Close manual"
            onClick={onClose}
          >
            <X size={19} />
          </StyledClose>
        </StyledHeader>

        <StyledColumns>
          <StyledRail aria-label="Manual topics">
            {MANUAL_GROUPS.map((group) => (
              <StyledGroup key={group.label}>
                <StyledGroupLabel data-testid="manual-group-label">
                  {group.label}
                </StyledGroupLabel>
                {group.topicIds.map((id) => {
                  const topic = MANUAL_TOPICS[id];
                  const EntryIcon = topic.icon;
                  const isActive = activeTopicId === id;

                  return (
                    <StyledRailEntry
                      key={id}
                      type="button"
                      $active={isActive}
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => jumpTo(id)}
                    >
                      <EntryIcon size={15} />
                      {topic.title}
                    </StyledRailEntry>
                  );
                })}
              </StyledGroup>
            ))}
          </StyledRail>

          <StyledPane data-testid="manual-pane" ref={paneRef}>
            {MANUAL_TOPICS_IN_ORDER.map((topic) => (
              <ManualSection
                key={topic.id}
                topic={topic}
                ref={(element) => registerSection(topic.id, element)}
              />
            ))}
          </StyledPane>
        </StyledColumns>
      </StyledPanel>
    </StyledOverlay>
  );
}
