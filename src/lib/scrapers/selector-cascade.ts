import type { CheerioAPI } from "cheerio";

/**
 * Selector cascade — try selectors in order until one returns a non-empty
 * trimmed string. Designed for scraper resilience against retailer DOM
 * changes: declare 3+ selectors per field, and the scraper survives the
 * common cases (primary node renamed, layout swapped, A/B test variant).
 *
 * Returns `null` when none match.
 */
export function trySelectors(
  $: CheerioAPI,
  selectors: readonly string[]
): string | null {
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text) return text;
  }
  return null;
}

/**
 * Same as `trySelectors` but reads an attribute. Useful for image src,
 * data-* fields, etc.
 */
export function trySelectorsAttr(
  $: CheerioAPI,
  selectors: readonly string[],
  attr: string
): string | null {
  for (const sel of selectors) {
    const value = $(sel).first().attr(attr);
    if (value && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Try selectors and return the first numeric value extractable from the
 * matched text. Handles `1,234.56`, `1.234,56` (Arabic), `SAR 199` etc.
 * Returns `null` if nothing parseable found.
 */
export function trySelectorsNumber(
  $: CheerioAPI,
  selectors: readonly string[]
): number | null {
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (!text) continue;
    const parsed = parsePrice(text);
    if (parsed !== null) return parsed;
  }
  return null;
}

/**
 * Parse a string that probably contains a price. Tolerant of:
 *   - currency prefixes / suffixes ("SAR 199.50", "$1,299", "1299 ر.س")
 *   - thousand separators (commas, dots)
 *   - decimal commas (European / Arabic style)
 *   - Arabic-Indic and Persian numerals
 */
export function parsePrice(raw: string): number | null {
  if (!raw) return null;
  // Convert Arabic-Indic / Persian numerals to ASCII
  const ascii = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

  // Strip everything that's not a digit, comma, dot, or minus
  const stripped = ascii.replace(/[^\d.,-]/g, "");
  if (!stripped) return null;

  // If we have both comma and dot, the LAST of them is the decimal separator.
  // Otherwise, if there's just one comma with 1 or 2 trailing digits, treat
  // it as decimal; same for a single dot.
  let normalized = stripped;
  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalIsDot = lastDot > lastComma;
    if (decimalIsDot) {
      normalized = stripped.replace(/,/g, "");
    } else {
      normalized = stripped.replace(/\./g, "").replace(",", ".");
    }
  } else if (lastComma >= 0) {
    const decPart = stripped.slice(lastComma + 1);
    if (decPart.length === 1 || decPart.length === 2) {
      normalized = stripped.replace(/,/g, ".").replace(/\.(?=.*\.)/g, "");
    } else {
      normalized = stripped.replace(/,/g, "");
    }
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
