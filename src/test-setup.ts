import "@testing-library/jest-dom/vitest";

// Recharts ResponsiveContainer uses ResizeObserver — polyfill for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
