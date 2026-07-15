export function formatBalance(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/**
 * A whole-euro `de-DE` currency string with no cents — e.g. `8 €`. Used where
 * the design shows rounded monthly figures (the Savings Streak targets).
 */
export function formatEuroWhole(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const exponent = Math.floor(Math.log(bytes) / Math.log(1024));
  const unitIndex = Math.min(exponent, BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** unitIndex;
  if (unitIndex === 0) {
    return `${value} ${BYTE_UNITS[0]}`;
  }
  const formatted = new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} ${BYTE_UNITS[unitIndex]}`;
}

/**
 * A file size as a whole number of kilobytes, floored to 1 KB so a tiny
 * statement never displays as "0 KB". Used by the Import feature's history
 * rows and upload card.
 */
export function formatFileSizeKB(bytes: number): number {
  return Math.max(1, Math.round(bytes / 1024));
}

/** Short month names, index 0 = January. Shared by the chart axes,
 *  tooltips, and the Month Overview picker grid. */
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatMonth(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-");
  return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
}

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMonthLong(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-");
  return `${MONTHS_LONG[parseInt(month, 10) - 1]} ${year}`;
}

export function toOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}
