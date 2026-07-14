/* ============================================================
   HORIZON — Icon primitive
   Curated simple line icons on a 24 grid. stroke-based.
   <Icon name="dashboard" size={18} />
   ============================================================ */
const HZ_ICON_PATHS = {
  dashboard: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  outlook: "M4 19h16M4 19V5M4 19l5-6 4 3 7-9",
  calendar:
    "M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5zM4 9h16M8 3.5v3M16 3.5v3",
  settings:
    "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  landmark: "M4 21h16M5 21V10M9 21V10M15 21V10M19 21V10M12 3 4 8h16z",
  piggy:
    "M5 11a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v3a3 3 0 0 1-3 3v2h-3v-2H9v2H6v-2.3A6 6 0 0 1 5 14zM19 11h2M15 9.5h.01",
  building:
    "M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M15 21h4a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-4M8 7h3M8 11h3M8 15h3",
  home: "M4 10.5 12 4l8 6.5M6 9.5V20h12V9.5M10 20v-5h4v5",
  trend: "M4 18 9.5 12l3.5 3L20 7M20 7h-4M20 7v4",
  card: "M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5zM3 10h18M6.5 14.5h4",
  wallet:
    "M4 7.5A1.5 1.5 0 0 1 5.5 6H18a1 1 0 0 1 1 1v1M3 8.5A1.5 1.5 0 0 1 4.5 7H19a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H4.5A1.5 1.5 0 0 1 3 17.5zM16 12.5h2.5",
  banknote:
    "M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9.5h.01M18 14.5h.01",
  plus: "M12 5v14M5 12h14",
  arrowLeft: "M19 12H5M5 12l6-6M5 12l6 6",
  arrowRight: "M5 12h14M14 6l6 6-6 6",
  arrowUpRight: "M7 17 17 7M9 7h8v8",
  chevronDown: "M6 9l6 6 6-6",
  chevronRight: "M9 6l6 6-6 6",
  x: "M6 6l12 12M18 6 6 18",
  check: "M5 12.5 10 17 19 7",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  clock: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2",
  flag: "M5 21V4M5 4l3-1 4 1.5L17 3l2 1v9l-2 1-5-1.5L8 14l-3 1",
  download: "M12 4v11M12 15l-4-4M12 15l4-4M5 19h14",
  upload: "M12 16V5M12 5 8 9M12 5l4 4M5 19h14",
  database:
    "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  pencil: "M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17zM14 7l3 3",
  trash:
    "M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M10 11v6M14 11v6",
  refresh: "M20 11a8 8 0 1 0-1.6 5M20 5v6h-6",
  shield: "M12 3 5 6v6c0 4 3 7 7 8 4-1 7-4 7-8V6zM9 12l2 2 4-4",
  sun: "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 2v2M12 20v2M4 12H2M22 12h-2M5.5 5.5 4 4M20 20l-1.5-1.5M18.5 5.5 20 4M4 20l1.5-1.5",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  dot: "M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0",
  grip: "M9 5.5a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM15 5.5a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM9 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM15 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM9 15.7a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8zM15 15.7a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z",
  filter: "M4 6h16M7 12h10M10 18h4",
  info: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 11v5M12 8h.01",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  eyeOff:
    "M3 3l18 18 M10.6 5.2A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.3 4.3 M6.5 6.6C3.9 8.3 2 12 2 12s3.6 7 10 7c1.6 0 3-.3 4.2-.9 M9.9 9.9a3 3 0 0 0 4.2 4.2",
  alert: "M12 3.5 22 20H2zM12 10v4.5M12 17.5h.01",
  flame:
    "M12 2.5c1 2.2-.4 3.6-1.6 4.9C9 8.7 7.5 10.4 7.5 13a4.5 4.5 0 0 0 9 0c0-1.4-.5-2.3-1-3.1.7.9 1.5 2.2 1.5 4.1a5 5 0 1 1-10 0c0-4 2.5-5.8 4-7.6.8-1 1.3-2 1-3.9z",
};

function Icon({
  name,
  size = 18,
  stroke = 2,
  color = "currentColor",
  style = {},
  fill,
}) {
  const d = HZ_ICON_PATHS[name];
  if (!d) return null;
  const solid = fill || name === "dot" || name === "grip";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={solid ? color : "none"}
      stroke={solid ? "none" : color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block", ...style }}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const HZ_KIND_ICON = {
  Girokonto: "landmark",
  Tagesgeld: "piggy",
  Mortgage: "home",
  CreditCard: "card",
  Investment: "trend",
};

Object.assign(window, { Icon, HZ_ICON_PATHS, HZ_KIND_ICON });
