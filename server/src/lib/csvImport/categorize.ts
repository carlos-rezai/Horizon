/**
 * Keyword-driven categorization onto Horizon's real categories. The map is
 * ordered: the first category with a matching keyword wins, and an unmatched
 * description falls back to "Miscellaneous". Matching is case-insensitive.
 */
const CATEGORY_KEYWORDS: Array<[string, string[]]> = [
  [
    "Food",
    [
      "rewe",
      "edeka",
      "aldi",
      "lidl",
      "penny",
      "kaufland",
      "netto",
      "lebensmittel",
      "supermarkt",
      "bäckerei",
      "baeckerei",
      "restaurant",
    ],
  ],
  [
    "Housing",
    ["miete", "vermieter", "nebenkosten", "strom", "heizung", "wohnung"],
  ],
  ["Income", ["gehalt", "lohn", "arbeitgeber", "einkommen"]],
  ["Subscriptions", ["netflix", "spotify", "abo", "disney", "prime"]],
  ["Entertainment", ["kino", "cinema", "konzert", "steam"]],
  ["Investment", ["sparplan", "etf", "broker", "depot", "aktien"]],
  ["Transfer", ["überweisung", "ueberweisung", "umbuchung"]],
];

export function categorize(description: string): string {
  const haystack = description.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return category;
    }
  }
  return "Miscellaneous";
}
