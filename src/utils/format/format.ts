export function formatBalance(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
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

const MONTHS = [
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
