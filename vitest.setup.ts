import "@testing-library/jest-dom/vitest";

// Recharts ResponsiveContainer uses ResizeObserver — polyfill for jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
