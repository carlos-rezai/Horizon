import type { Category } from "../../storage/types.js";
import { counterpartyKey } from "./counterpartyKey.js";
import type { CategorySource, MappedRow } from "./types.js";

/** The category every row nothing else categorizes falls back to. */
export const FALLBACK_CATEGORY = "Miscellaneous";

/**
 * One Keyword Group: a canonical category name, the names it also answers to,
 * and the lowercased substrings that mark a row as belonging to it.
 */
export interface KeywordGroup {
  category: string;
  synonyms: readonly string[];
  keywords: readonly string[];
}

/**
 * The ordered Keyword Groups — the cold-start fallback when no Category Rule
 * applies. The first group whose keyword is found wins, so the more specific
 * household payees come first. Keywords are distinctive payee names, never
 * generic words ("supermarkt", "arbeitgeber") that would sweep up unrelated
 * rows.
 */
export const KEYWORD_GROUPS: readonly KeywordGroup[] = [
  {
    category: "Groceries",
    synonyms: ["Food", "Lebensmittel"],
    keywords: [
      "rewe",
      "edeka",
      "aldi",
      "lidl",
      "kaufland",
      "netto marken",
      "penny",
      "denns",
      "alnatura",
      "tegut",
      "globus",
    ],
  },
  {
    category: "Dining",
    synonyms: ["Restaurants", "Eating Out"],
    keywords: [
      "restaurant",
      "lieferando",
      "mcdonald",
      "burger king",
      "starbucks",
      "pizzeria",
      "wolt",
    ],
  },
  {
    category: "Transport",
    synonyms: ["Travel", "Mobility"],
    keywords: [
      "deutsche bahn",
      "db vertrieb",
      "bvg",
      "mvg",
      "aral",
      "shell",
      "esso",
      "uber bv",
      "flixbus",
      "tankstelle",
    ],
  },
  {
    category: "Shopping",
    synonyms: ["Clothing"],
    keywords: [
      "amazon",
      "zalando",
      "ikea",
      "otto gmbh",
      "mediamarkt",
      "saturn",
      "h&m",
      "rossmann",
    ],
  },
  {
    category: "Health",
    synonyms: ["Healthcare", "Medical"],
    keywords: ["apotheke", "arztpraxis", "zahnarzt", "fitness"],
  },
  {
    category: "Housing",
    synonyms: ["Rent", "Utilities"],
    keywords: ["miete", "stadtwerke", "vattenfall", "e.on", "rundfunk"],
  },
  {
    category: "Income",
    synonyms: ["Salary"],
    keywords: ["gehalt", "lohn", "bezuege"],
  },
  {
    category: "Subscriptions",
    synonyms: ["Abos"],
    keywords: [
      "netflix",
      "spotify",
      "disney plus",
      "apple.com",
      "audible",
      "telekom",
      "vodafone",
      "o2 ",
    ],
  },
  {
    category: "Entertainment",
    synonyms: ["Leisure"],
    keywords: ["kino", "cinema", "eventim", "steam", "playstation"],
  },
  {
    category: "Investment",
    synonyms: ["Investments", "Savings"],
    keywords: ["trade republic", "scalable capital", "sparplan", "depot"],
  },
  {
    category: "Transfer",
    synonyms: ["Transfers"],
    keywords: ["umbuchung", "uebertrag", "übertrag", "paypal"],
  },
  {
    category: "Insurance",
    synonyms: ["Versicherung"],
    keywords: ["versicherung", "allianz", "huk-coburg"],
  },
];

/** What categorizeRow needs beyond the row itself. */
export interface CategorizeContext {
  /** Category Rules: Counterparty Key → category name (existing categories only). */
  rules: ReadonlyMap<string, string>;
  /** The user's categories, hidden ones included. */
  categories: readonly Category[];
  /** Canonical names the user declined as Category Proposals. */
  declined: ReadonlySet<string>;
}

/** A row's category and why it carries it. */
export interface CategorizedRow {
  category: string;
  categorySource: CategorySource;
  /** A Category Proposal's canonical name, set only when the source is `proposed`. */
  proposedCategory?: string;
}

/** The user's first visible category carrying the group's name or a synonym. */
function resolveGroup(
  group: KeywordGroup,
  categories: readonly Category[]
): string | undefined {
  const names = new Set(
    [group.category, ...group.synonyms].map((name) => name.toLowerCase())
  );
  return categories.find(
    (category) => !category.hidden && names.has(category.name.toLowerCase())
  )?.name;
}

/**
 * Whether the group's canonical name may be proposed: not declined and not
 * already held by a Hidden Category, both compared ignoring case.
 */
function canPropose(group: KeywordGroup, ctx: CategorizeContext): boolean {
  const name = group.category.toLowerCase();
  for (const declined of ctx.declined) {
    if (declined.toLowerCase() === name) return false;
  }
  return !ctx.categories.some(
    (category) => category.hidden && category.name.toLowerCase() === name
  );
}

/**
 * Categorize one row. Precedence: the Category Rule for its Counterparty Key
 * (`learned`) → the first Keyword Group found in the lowercased counterparty
 * plus description that resolves to a visible category (`suggested`) or, when
 * the user has none for it, proposes its canonical name (`proposed`, in
 * Miscellaneous) unless declined or hidden → Miscellaneous (`unmatched`). Pure.
 */
export function categorizeRow(
  row: MappedRow,
  ctx: CategorizeContext
): CategorizedRow {
  const key = counterpartyKey(row.counterparty);
  const learned = key === "" ? undefined : ctx.rules.get(key);
  // A rule whose category no longer exists is skipped, never applied.
  if (
    learned !== undefined &&
    ctx.categories.some((category) => category.name === learned)
  ) {
    return { category: learned, categorySource: "learned" };
  }

  const haystack = `${row.counterparty} ${row.description}`.toLowerCase();
  for (const group of KEYWORD_GROUPS) {
    if (!group.keywords.some((keyword) => haystack.includes(keyword))) continue;
    const category = resolveGroup(group, ctx.categories);
    if (category !== undefined) {
      return { category, categorySource: "suggested" };
    }
    if (canPropose(group, ctx)) {
      return {
        category: FALLBACK_CATEGORY,
        categorySource: "proposed",
        proposedCategory: group.category,
      };
    }
  }

  return { category: FALLBACK_CATEGORY, categorySource: "unmatched" };
}
