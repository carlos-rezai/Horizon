async () => {
  const sel =
    'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="switch"], [role="combobox"], [role="option"], [contenteditable="true"]';
  const root =
    document.querySelector('[role="dialog"][aria-modal="true"]') ?? document;
  const els = [...root.querySelectorAll(sel)].filter((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.visibility !== "hidden" &&
      cs.display !== "none"
    );
  });
  const px = (v) => (v === "0px" ? 0 : v);
  const textBox = (el) => {
    const range = document.createRange();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let first = null,
      last = null,
      n;
    while ((n = walker.nextNode())) {
      if (n.textContent.trim()) {
        first ??= n;
        last = n;
      }
    }
    if (!first) return null;
    range.setStart(first, 0);
    range.setEnd(last, last.textContent.length);
    return range.getBoundingClientRect();
  };
  const out = [];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const tb = textBox(el);
    const pad = {
      l: parseFloat(cs.paddingLeft),
      r: parseFloat(cs.paddingRight),
    };
    let textOffset = null;
    if (tb && tb.width > 0) {
      const leftGap = tb.left - r.left,
        rightGap = r.right - tb.right;
      const topGap = tb.top - r.top,
        bottomGap = r.bottom - tb.bottom;
      textOffset = {
        leftGap: +leftGap.toFixed(1),
        rightGap: +rightGap.toFixed(1),
        topGap: +topGap.toFixed(1),
        bottomGap: +bottomGap.toFixed(1),
      };
    }
    const rest = {
      outline: cs.outline,
      boxShadow: cs.boxShadow,
      borderColor: cs.borderColor,
    };
    let focus = null;
    if (!el.disabled && typeof el.focus === "function" && el.tagName !== "A") {
      el.focus({ preventScroll: true });
      if (document.activeElement === el) {
        const fs = getComputedStyle(el);
        focus = {
          outline: fs.outline,
          outlineOffset: fs.outlineOffset,
          boxShadow: fs.boxShadow,
          borderColor: fs.borderColor,
        };
        if (
          focus.outline === rest.outline &&
          focus.boxShadow === rest.boxShadow &&
          focus.borderColor === rest.borderColor
        )
          focus = "NO_CHANGE";
      }
      el.blur();
    }
    const label = (
      el.getAttribute("aria-label") ??
      el.textContent ??
      el.getAttribute("placeholder") ??
      el.value ??
      ""
    )
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);
    out.push({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute("type") ?? undefined,
      role: el.getAttribute("role") ?? undefined,
      label,
      cls:
        [...el.classList]
          .filter((c) => !/^sc-/.test(c))
          .slice(0, 2)
          .join(" ") || undefined,
      x: Math.round(r.left),
      y: Math.round(r.top),
      w: +r.width.toFixed(1),
      h: +r.height.toFixed(1),
      font: `${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily.split(",")[0]}`,
      radius: px(cs.borderRadius),
      bg: cs.backgroundColor,
      border: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
      padding: cs.padding,
      textAlign: cs.textAlign,
      display: cs.display,
      justify: cs.justifyContent,
      align: cs.alignItems,
      boxSizing: cs.boxSizing,
      disabled:
        el.disabled || el.getAttribute("aria-disabled") === "true" || undefined,
      opacity: cs.opacity !== "1" ? cs.opacity : undefined,
      textOffset,
      focus,
    });
  }
  return {
    url: location.hash,
    scope: root === document ? "page" : "dialog",
    viewport: `${innerWidth}x${innerHeight}`,
    count: out.length,
    elements: out,
  };
};
