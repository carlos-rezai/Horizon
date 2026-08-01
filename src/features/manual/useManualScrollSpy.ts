import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { ManualTopicId } from "./manualTypes";

/**
 * Breathing room above a jumped-to section, and the same line the spy measures
 * the scroll position against — so a jump and a free scroll agree on which
 * topic is being shown rather than disagreeing by a hair at the boundary.
 */
const SECTION_MARGIN = 18;

export interface ManualScrollSpy {
  /** Whichever topic the pane is currently showing. */
  activeTopicId: ManualTopicId;
  /** Goes on the scrolling pane. The pane owns the scroll, not the page. */
  paneRef: RefObject<HTMLDivElement | null>;
  /** Each section hands itself in; `null` on unmount withdraws it. */
  registerSection: (id: ManualTopicId, element: HTMLElement | null) => void;
  /** Marks a topic active at once and scrolls the pane to it. */
  jumpTo: (id: ManualTopicId) => void;
}

/**
 * Keeps the table of contents truthful. The rail is navigation, never a router:
 * every topic is in the pane at all times, so "where am I" is a question about
 * scroll position, and only this module answers it.
 *
 * Putting the observation behind a hook means the strategy — offsets read off
 * the pane today, an IntersectionObserver tomorrow — is one module's business,
 * and the drawer's own tests can drive the click path without faking layout.
 *
 * Jumps compute the target's offset and scroll the pane, explicitly not
 * `scrollIntoView`, which would scroll the screen sitting behind the drawer.
 */
export function useManualScrollSpy(topicIds: ManualTopicId[]): ManualScrollSpy {
  const [activeTopicId, setActiveTopicId] = useState<ManualTopicId>(
    topicIds[0]
  );
  const paneRef = useRef<HTMLDivElement | null>(null);
  const sections = useRef(new Map<ManualTopicId, HTMLElement>());

  const registerSection = useCallback(
    (id: ManualTopicId, element: HTMLElement | null) => {
      if (element) {
        sections.current.set(id, element);
      } else {
        sections.current.delete(id);
      }
    },
    []
  );

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;

    const onScroll = () => {
      // The last section whose top has passed the probe line is the one being
      // read; `topicIds` is already in document order, so this is a sweep, not
      // a search. Falls back to the first topic before anything has scrolled.
      const probe = pane.scrollTop + SECTION_MARGIN + 1;
      let shown = topicIds[0];

      topicIds.forEach((id) => {
        const section = sections.current.get(id);
        if (section && section.offsetTop <= probe) shown = id;
      });

      setActiveTopicId(shown);
    };

    pane.addEventListener("scroll", onScroll);
    return () => pane.removeEventListener("scroll", onScroll);
  }, [topicIds]);

  const jumpTo = useCallback((id: ManualTopicId) => {
    // The highlight moves first and unconditionally: a rail entry whose section
    // never made it into the tree still answers the click.
    setActiveTopicId(id);

    const pane = paneRef.current;
    const section = sections.current.get(id);
    if (!pane || !section) return;

    pane.scrollTo({
      top: Math.max(section.offsetTop - SECTION_MARGIN, 0),
      behavior: "smooth",
    });
  }, []);

  return { activeTopicId, paneRef, registerSection, jumpTo };
}
