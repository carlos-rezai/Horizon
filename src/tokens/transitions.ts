// `swapDuration` / `easing` are the motion pair the transitions work is built
// on: one duration inside the restrained 150–200ms band and one eased curve, so
// the data-swap cross-fade, the skeleton→content fade and the accordion expands
// all move the same way instead of each style file inventing its own timing.
const swapDuration = "180ms";
const easing = "cubic-bezier(0.4, 0, 0.2, 1)";

export const transitions = {
  fast: "0.15s ease",
  normal: "0.3s ease",
  spinDuration: "0.7s",
  swapDuration,
  easing,
  /** Duration + curve, for `transition` / `animation` shorthands. */
  swap: `${swapDuration} ${easing}`,
};
