/** Reading money, dates and percentages out of raw cell and sentence text. */

export type Amount = {
  value: number | null;
  /** The document wrote this as a negative: a minus sign or parentheses. */
  negative: boolean;
  /** "about", "approx.", "~". */
  approximate: boolean;
  /** "???", "N/A", "TBD", a bare dash. Explicitly unknown, not zero. */
  unknown: boolean;
  /** The exact substring the number was read from. */
  raw: string;
};

const NOTHING: Amount = {
  value: null,
  negative: false,
  approximate: false,
  unknown: false,
  raw: "",
};

const UNKNOWN_RE =
  /^\s*(\?+|n\s*\/?\s*a|tbd|unknown|none\s+stated|not\s+stated|-{1,3}|\.{2,})\s*$/i;

/**
 * Substrings that contain digits but are never money.
 *
 * Without this a ledger row like "01/08/2026 | TRANSFER TO xxxx-8820 | 500.00"
 * reads as 1, from the date, rather than 500.00, and a masked account
 * reference becomes a four-figure amount.
 */
const NOT_MONEY: RegExp[] = [
  /\b\d{4}-\d{2}-\d{2}\b/g, //                             2026-01-08
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, //                     01/08/2026
  /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g, //                       01-08-2026
  /\b[xX*•#]{2,}[\s-]?\d{2,6}\b/g, //                 xxxx-8820
  /\b\d{0,2}[xX*#]{3,}[\s-]?\d{2,6}\b/g, //                4xxxx8820
  /\b\d+(?:\.\d+)?\s*%/g, //                               4.250%
  // 90 days, 90 calendar days, 4 years
  /\b\d[\d,]*(?:\.\d+)?\s*(?:\w+\s+)?(?:days?|months?|years?|shares?|units?|sf|square\s+feet)\b/gi,
  /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}\b/gi,
  /\b(?:19|20)\d{2}\b(?![\d.,])/g, //                      a bare year
  /#\s?\d+/g, //                                           cheque numbers
  /\b\d[\d,]*(?:\.\d+)?-[A-Za-z]/g, //                     18-Month, 30-Year
  /\bP\.?\s?O\.?\s+Box\s+\d+/gi, //                        PO Box 7741
  /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g, //                   MD 20850
  /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, //               phone numbers
  /\b(?:ID|No\.?|Number|Claim|Suite|Ste\.?|Apt\.?|Unit)\s*#?\s*\d[\d-]*/gi,
  // Street addresses in letterheads: "1150 Lakeside Drive", "14 Ashfield Lane"
  /\b\d{1,6}\s+(?:[A-Z][A-Za-z]*\s+){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Way|Court|Ct|Place|Pl|Plaza|Circle|Cir|Terrace|Trail|Parkway|Pkwy|Highway|Hwy|Centre|Center)\b\.?/g,
];

/** Blank out every digit-bearing run that is not an amount. */
function scrub(text: string): string {
  let out = text;
  for (const re of NOT_MONEY) {
    out = out.replace(re, (m) => " ".repeat(m.length));
  }
  return out;
}

const MONEY_RE =
  /(\()?\s*(-)?\s*\$?\s*(-)?\s*((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)\s*(-)?\s*(\))?/;

/**
 * Parse the first money-like number in a string.
 *
 * Handles $ prefixes, thousands separators, parenthesised negatives, leading
 * and trailing minus signs, and the several ways a document says "we do not
 * know this".
 */
export function parseMoney(text: string | null | undefined): Amount {
  if (!text) return NOTHING;
  const s = String(text).trim();
  if (!s) return NOTHING;

  if (UNKNOWN_RE.test(s)) {
    return { ...NOTHING, unknown: true, raw: s };
  }

  const m = MONEY_RE.exec(scrub(s));
  if (!m) return NOTHING;

  const [, openParen, lead1, lead2, digits, trail, closeParen] = m;
  const n = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(n)) return NOTHING;

  /*
   * Parentheses mean "negative" in a ledger column, but in a sentence they
   * are usually a gloss: "two thousand one hundred eighty-four dollars
   * ($2,184.00)". Honour the accounting convention only when the whole field
   * is the number.
   */
  const parenthesisedField = /^\(\s*-?\s*\$?\s*[\d,]+(?:\.\d{1,2})?\s*\)$/.test(s);
  const negative = Boolean((openParen && closeParen && parenthesisedField) || lead1 || lead2 || trail);

  return {
    value: negative ? -n : n,
    negative,
    approximate: /\babout\b|\bapprox(imately)?\.?|~|\broughly\b|\bestimated?\b/i.test(s),
    unknown: false,
    raw: m[0].trim(),
  };
}

/** Every money-like number in a string, in order. */
export function allMoney(text: string): Amount[] {
  const out: Amount[] = [];
  const scrubbed = scrub(text);
  const approximate = /\babout\b|\bapprox|~|\broughly\b|\bestimated?\b/i.test(text);
  const prose = /[A-Za-z]{3,}/.test(text);
  const re = new RegExp(MONEY_RE.source, "g");

  let m: RegExpExecArray | null;
  while ((m = re.exec(scrubbed)) !== null) {
    if (m[0].trim() === "") {
      re.lastIndex++;
      continue;
    }
    let parsed = parseMoney(m[0]);
    // Inside a sentence, parentheses around a figure are a gloss, not a minus.
    if (prose && parsed.negative && parsed.value != null && !m[0].includes("-")) {
      parsed = { ...parsed, value: Math.abs(parsed.value), negative: false };
    }
    if (parsed.value != null) out.push({ ...parsed, approximate });
  }
  return out;
}

/** True when a cell is essentially a number rather than a label. */
export function looksNumeric(text: string): boolean {
  const s = text.trim();
  if (!s) return false;
  return /^[$(\-+]?\s*[\d,]+(\.\d+)?\s*[%)\-]?$/.test(s);
}

const PERCENT_RE = /(\d+(?:\.\d+)?)\s*%/;

export function parsePercent(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = PERCENT_RE.exec(String(text));
  return m ? Number(m[1]) : null;
}

const MONTHS =
  "january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec";

const DATE_PATTERNS: RegExp[] = [
  /\b(\d{4})-(\d{2})-(\d{2})\b/,
  /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
  new RegExp(`\\b(${MONTHS})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`, "i"),
  new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS})\\.?,?\\s+(\\d{4})\\b`, "i"),
];

/** The first date in a string, returned exactly as the document wrote it. */
export function findDate(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const re of DATE_PATTERNS) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

const PERIOD_RE =
  /\b(?:statement\s+period|billing\s+cycle|for\s+the\s+period|service\s+period|period)\b[:\s]*([^\n|]{4,60})/i;

export function findPeriod(text: string): string | null {
  const m = PERIOD_RE.exec(text);
  if (!m) return null;
  const cleaned = m[1].replace(/\s+/g, " ").trim().replace(/[.;,]$/, "");
  // Azure returns markdown tables as HTML, so "elimination period</td>" matches.
  if (!cleaned || cleaned.includes("<") || cleaned.includes(">")) return null;
  // A period names dates. Without a year it is some other use of the word.
  if (!/\d{4}/.test(cleaned)) return null;
  return cleaned.length >= 4 ? cleaned : null;
}

/** Mask-style account references already redacted in the document. */
const MASKED_RE = /\b(?:[xX*•#]{2,}[\s-]?\d{2,4}|\d{0,2}[xX*•#]{3,}\d{2,4})\b/;

export function findMasked(text: string): string | null {
  const m = MASKED_RE.exec(text);
  return m ? m[0] : null;
}

/** Round to cents so repeated float addition does not drift. */
export function cents(n: number): number {
  return Math.round(n * 100) / 100;
}
