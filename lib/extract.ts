/**
 * Stage 2: Azure layout output to structured candidate fields.
 *
 * This is a deterministic rules engine. No language model is involved at any
 * point. Every value it proposes is read from a specific table cell or
 * paragraph in the Azure response, and every line carries the provenance that
 * says which one.
 *
 * What that buys: the same document always yields the same fields, every
 * figure can be traced back to the text it came from, and nothing is ever
 * invented. What it costs: the engine only recognises what its lexicon
 * describes, so an unusual layout yields fewer candidates rather than wrong
 * ones. Both are deliberate. A reviewer confirms everything either way.
 */

import {
  APPROXIMATE_RE,
  ASSET_RULES,
  COLA_RE,
  CONDITIONAL_RE,
  DECOY_HEADER_RE,
  DOC_TYPES,
  EXPENSE_RULES,
  FAMILY_PREPARED_RE,
  FUTURE_PROCEED_RE,
  GIFT_RE,
  INCOME_RULES,
  LIABILITY_RULES,
  NET_RE,
  OWN_ACCOUNT_RE,
  PII_SIGNATURES,
  RELATIONSHIP_RE,
  SUBTOTAL_RE,
  SUPERSEDE_RE,
  VALUE_HEADER_RE,
} from "./lexicon";
import {
  allMoney,
  cents,
  findDate,
  findMasked,
  findPeriod,
  looksNumeric,
  parseMoney,
  parsePercent,
  type Amount,
} from "./money";
import type {
  Account,
  Expense,
  Extraction,
  Finding,
  IncomeStream,
  InsurancePolicy,
  Liability,
  Provenance,
  TimedProceed,
  Transfer,
} from "./schema";
import type { LayoutResult, LayoutTable } from "./types";

export function engineStatus() {
  return { ready: true, engine: "deterministic rules engine v1" };
}

/* ───────────────────────────── candidate rows ──────────────────────────── */

/** One labelled figure found somewhere in the document. */
type Candidate = {
  label: string;
  /** Full text of the row or sentence, used for secondary signals. */
  context: string;
  amount: Amount;
  /** What the column header said this number is: a balance, or a per-month figure. */
  kind: "balance" | "monthly" | "annual" | "unknown";
  /** Which sweep produced the line. A ledger row is a flow, never a holding. */
  source: "table" | "ledger" | "paragraph";
  provenance: Provenance;
  extra: Record<string, string>;
};

function headerKind(header: string): Candidate["kind"] {
  if (/\bper\s+month\b|\bmonthly\b|\/\s*mo\b|\bmo\.\b/i.test(header)) return "monthly";
  if (/\bper\s+year\b|\bannual(ly)?\b|\/\s*yr\b|\byearly\b/i.test(header)) return "annual";
  if (/\bbalance\b|\bvalue\b|\bprincipal\b|\boutstanding\b|\bowed\b|\bamount\b|\btotal\b/i.test(header))
    return "balance";
  return "unknown";
}

/**
 * Pick the column that holds the figure a reviewer actually wants.
 *
 * Statements routinely print an opening balance, a cost basis and a
 * year-to-date column beside the current value. Choosing the wrong one is the
 * single most common way an extractor goes quietly wrong, so decoy headers are
 * rejected outright rather than ranked.
 */
/**
 * Find the real header row.
 *
 * Statements often print a banner across the top of a table ("AMOUNT OWED",
 * "ESCROW ACCOUNT") with the column headings on the row beneath. Taken as the
 * header, the banner's single cell is read as a value column and the table's
 * figures are never reached.
 */
function headerRowIndex(table: LayoutTable): number {
  const first = table.grid[0] ?? [];
  const filled = first.filter((c) => (c?.content ?? "").trim()).length;
  const isBanner = filled === 1 && first.length > 1 && table.grid.length > 2;
  return isBanner ? 1 : 0;
}

function chooseValueColumn(table: LayoutTable): { index: number; header: string } | null {
  const hr = headerRowIndex(table);
  const headerRow = table.grid[hr] ?? [];
  const headers = headerRow.map((c) => c?.content ?? "");

  const scored: { index: number; header: string; score: number }[] = [];

  headers.forEach((h, i) => {
    if (!h) return;
    if (DECOY_HEADER_RE.test(h)) return;
    if (!VALUE_HEADER_RE.test(h)) return;

    let score = 1;
    if (/\b(closing|ending|current|market|present)\b/i.test(h)) score += 3;
    if (/\b(outstanding|principal|owed|payoff)\b/i.test(h)) score += 3;
    if (/\bmonthly\b|\bper\s+month\b/i.test(h)) score += 2;
    if (/\btotal\b/i.test(h)) score += 1;
    score += i / 100; // ties break rightwards, where current values usually sit
    scored.push({ index: i, header: h, score });
  });

  if (scored.length) {
    scored.sort((a, b) => b.score - a.score);
    return { index: scored[0].index, header: scored[0].header };
  }

  // No usable header. Fall back to the rightmost column that is mostly numeric.
  for (let c = headers.length - 1; c >= 1; c--) {
    let numeric = 0;
    let filled = 0;
    for (let r = hr + 1; r < table.grid.length; r++) {
      const cell = table.grid[r]?.[c];
      if (!cell || !cell.content.trim()) continue;
      filled++;
      if (looksNumeric(cell.content)) numeric++;
    }
    if (filled >= 2 && numeric / filled >= 0.6) {
      return { index: c, header: headers[c] ?? "" };
    }
  }
  return null;
}

type LedgerColumns = {
  date: number;
  description: number;
  debit: number;
  credit: number;
  amount: number;
  balance: number;
};

/**
 * Identify a transaction ledger and locate its columns.
 *
 * A ledger prints a running balance in every row. Read as a balance table it
 * produces one bogus "account" per transaction, each holding the running
 * total, so ledgers are routed away from the balance sweep entirely and read
 * as flows instead.
 */
function ledgerColumns(table: LayoutTable): LedgerColumns | null {
  const headers = (table.grid[0] ?? []).map((c) => (c?.content ?? "").toLowerCase());
  const find = (re: RegExp) => headers.findIndex((h) => re.test(h));

  const cols: LedgerColumns = {
    date: find(/\bdate\b|\bposted\b/),
    description: find(/\b(?:description|memo|details?|payee|narrative|transactions?|activity)\b/),
    debit: find(/\bdebits?\b|\bwithdrawals?\b|\bcharges?\b|\bpayments?\s+out\b/),
    credit: find(/\bcredits?\b|\bdeposits?\b|\bpayments?\s+in\b/),
    amount: find(/^\s*amount\s*$/),
    balance: find(/\bbalance\b/),
  };

  const hasFlow = cols.debit >= 0 || cols.credit >= 0 || cols.amount >= 0;
  const isLedger = cols.date >= 0 && cols.description >= 0 && (hasFlow || cols.balance >= 0);
  return isLedger ? cols : null;
}

function rowLabel(row: (LayoutTable["grid"][number][number])[]): string {
  for (const cell of row) {
    if (!cell) continue;
    const text = cell.content.trim();
    if (!text) continue;
    if (looksNumeric(text)) continue;
    return text;
  }
  return "";
}

function fromTables(layout: LayoutResult): Candidate[] {
  const out: Candidate[] = [];

  layout.tables.forEach((table, ti) => {
    if (ledgerColumns(table)) return; // read as flows below, not as balances
    const value = chooseValueColumn(table);
    if (!value) return;

    const hr = headerRowIndex(table);
    const headers = (table.grid[hr] ?? []).map((c) => c?.content ?? "");
    const kind = headerKind(value.header);

    for (let r = hr + 1; r < table.grid.length; r++) {
      const row = table.grid[r] ?? [];
      const label = rowLabel(row);
      if (!label) continue;

      const cell = row[value.index];
      const amount = parseMoney(cell?.content ?? "");
      if (amount.value == null && !amount.unknown) continue;

      // Keep the whole row: memos, dates and rates live in the other columns.
      const context = row
        .map((c) => c?.content ?? "")
        .filter(Boolean)
        .join(" | ");

      const extra: Record<string, string> = {};
      headers.forEach((h, i) => {
        const text = row[i]?.content?.trim();
        if (h && text && i !== value.index) extra[h.toLowerCase()] = text;
      });

      out.push({
        label,
        context,
        amount,
        kind,
        source: "table",
        extra,
        provenance: {
          where: `Table ${ti + 1}, row ${r}`,
          page: table.page,
          snippet: context.slice(0, 220),
        },
      });
    }
  });

  return out;
}

/**
 * Money in and money out of a transaction ledger.
 *
 * A statement covers one period, so a credit inside it is a single-period
 * observation rather than a proven recurring amount. That caveat is recorded
 * in the reasoning summary rather than asserted away here.
 */
function fromLedgers(layout: LayoutResult): Candidate[] {
  const out: Candidate[] = [];

  layout.tables.forEach((table, ti) => {
    const cols = ledgerColumns(table);
    if (!cols) return;

    const headers = (table.grid[0] ?? []).map((c) => c?.content ?? "");

    for (let r = 1; r < table.grid.length; r++) {
      const row = table.grid[r] ?? [];
      const description = (row[cols.description]?.content ?? "").trim();
      if (!description || description.startsWith("Memo:")) continue;

      const context = row.map((c) => c?.content ?? "").filter(Boolean).join(" | ");

      const candidates: { index: number; direction: "in" | "out" }[] = [];
      if (cols.credit >= 0) candidates.push({ index: cols.credit, direction: "in" });
      if (cols.debit >= 0) candidates.push({ index: cols.debit, direction: "out" });
      if (cols.amount >= 0) candidates.push({ index: cols.amount, direction: "out" });

      for (const { index } of candidates) {
        const amount = parseMoney(row[index]?.content ?? "");
        if (amount.value == null || amount.value === 0) continue;

        const extra: Record<string, string> = {};
        headers.forEach((h, i) => {
          const text = row[i]?.content?.trim();
          if (h && text && i !== index) extra[h.toLowerCase()] = text;
        });

        out.push({
          label: description,
          context,
          amount: { ...amount, value: Math.abs(amount.value) },
          kind: "monthly",
          source: "ledger",
          extra,
          provenance: {
            where: `Table ${ti + 1}, row ${r}`,
            page: table.page,
            snippet: context.slice(0, 220),
          },
        });
      }
    }
  });

  return out;
}

/** Documents like an SSA award letter put every figure inside a sentence. */
const HEADER_ROLES = new Set(["title", "pageHeader", "pageFooter", "pageNumber", "footnote"]);

function fromParagraphs(layout: LayoutResult): Candidate[] {
  const out: Candidate[] = [];

  /*
   * Azure reports every table cell as a paragraph as well. Re-reading those
   * fragments out of their row strips them of the header that gave them
   * meaning: the cell "18-Month Certificate of Deposit" becomes the amount
   * -18, and "SSA TREAS 310 XXSOC SEC DIRECT DEP" becomes income of $310.
   * The table sweep has already read them properly, so skip them here.
   */
  const cellText = new Set<string>();
  for (const table of layout.tables) {
    for (const row of table.grid) {
      for (const cell of row) {
        const content = cell?.content?.trim();
        if (content) cellText.add(content.replace(/\s+/g, " ").toLowerCase());
      }
    }
  }

  layout.paragraphs.forEach((para, pi) => {
    const text = para.content.trim();
    if (text.length < 6) return;
    if (cellText.has(text.replace(/\s+/g, " ").toLowerCase())) return;
    // Letterheads, running heads and footers carry addresses, not figures.
    if (para.role && HEADER_ROLES.has(para.role)) return;

    // Split into sentences so one paragraph can yield several figures.
    const sentences = text.split(/(?<=[.;:!?])\s+(?=[A-Z$(])/);

    for (const sentence of sentences) {
      const amounts = allMoney(sentence);
      if (!amounts.length) continue;

      // "Label: $1,234" gives a cleaner label than the whole sentence.
      const labelled = /^([^:$]{3,60}?)\s*[:-]\s*\$?\s*[\d(]/.exec(sentence.trim());
      const label = labelled
        ? labelled[1].trim()
        : sentence.replace(/\s+/g, " ").trim().slice(0, 120);

      const kind: Candidate["kind"] = /\bper\s+month\b|\bmonthly\b|\ba\s+month\b|\beach\s+month\b/i.test(
        sentence,
      )
        ? "monthly"
        : /\bper\s+year\b|\bannual(ly)?\b|\ba\s+year\b|\beach\s+year\b/i.test(sentence)
          ? "annual"
          : "unknown";

      out.push({
        label,
        context: sentence.replace(/\s+/g, " ").trim(),
        amount: amounts[0],
        kind,
        source: "paragraph",
        extra: {},
        provenance: {
          where: `Page ${para.page ?? "?"}, paragraph ${pi + 1}`,
          page: para.page,
          snippet: sentence.replace(/\s+/g, " ").trim().slice(0, 220),
        },
      });
    }
  });

  return out;
}

/* ──────────────────────────── classification ───────────────────────────── */

type Bucket = "asset" | "liability" | "income" | "expense" | "none";

type Verdict = {
  bucket: Bucket;
  score: number;
  assetType?: Account["account_type"];
  liquidity?: Account["liquidity"];
  liabilityType?: Liability["liability_type"];
  normalised?: string;
};

/**
 * Score a candidate against every rule set and take the strongest reading.
 *
 * Context matters as much as the label: "IRA" under a Balance column is an
 * asset, while "IRA distribution" under a Monthly column is income. The column
 * header supplies that disambiguation, so it is weighted rather than ignored.
 */
function classify(c: Candidate): Verdict {
  const text = `${c.label} ${c.context}`;
  let best: Verdict = { bucket: "none", score: 0 };

  const balanceContext = c.kind === "balance";
  const flowContext = c.kind === "monthly" || c.kind === "annual";

  /*
   * A ledger row records money that moved, not money that is held. "TRANSFER
   * TO OWN SAVINGS xxxx-8820  500.00" names a savings account but is not one:
   * read as a holding it invents an account worth the size of one transfer.
   * Ledger lines are therefore eligible for income and expense only.
   */
  const flowsOnly = c.source === "ledger";

  if (!flowsOnly) {
    for (const rule of LIABILITY_RULES) {
      if (!rule.re.test(text)) continue;
      const score = rule.weight + (balanceContext ? 0.1 : 0);
      if (score > best.score) {
        best = { bucket: "liability", score, liabilityType: rule.type };
      }
      break;
    }

    for (const rule of ASSET_RULES) {
      if (!rule.re.test(text)) continue;
      const score = rule.weight + (balanceContext ? 0.1 : 0) - (flowContext ? 0.25 : 0);
      if (score > best.score) {
        best = {
          bucket: "asset",
          score,
          assetType: rule.type,
          liquidity: rule.liquidity,
        };
      }
      break;
    }
  }

  for (const rule of INCOME_RULES) {
    if (!rule.re.test(text)) continue;
    const score = rule.weight + (flowContext ? 0.15 : 0) - (balanceContext ? 0.2 : 0);
    if (score > best.score) {
      best = { bucket: "income", score, normalised: rule.label };
    }
    break;
  }

  for (const rule of EXPENSE_RULES) {
    if (!rule.re.test(text)) continue;
    const score = rule.weight + (flowContext ? 0.15 : 0) - (balanceContext ? 0.2 : 0);
    if (score > best.score) {
      best = { bucket: "expense", score, normalised: rule.label };
    }
    break;
  }

  return best;
}

/* ──────────────────────────── targeted readers ─────────────────────────── */

function readInsurance(markdown: string, layout: LayoutResult): InsurancePolicy[] {
  if (!/\blong[\s-]term\s+care\b|\bLTC\b|\bbenefit\s+pool\b|\bdaily\s+benefit\b|\bcash\s+surrender\b|\bwhole\s+life\b/i.test(markdown)) {
    return [];
  }

  const grab = (re: RegExp): Amount => {
    const m = re.exec(markdown);
    return m ? parseMoney(m[1] ?? m[0]) : parseMoney(null);
  };

  const daily = grab(/\bdaily\s+(?:maximum\s+)?benefit\b[^$\d\n]{0,30}(\$?[\d,]+(?:\.\d{2})?)/i);
  const monthly = grab(/\bmonthly\s+(?:maximum\s+)?benefit\b[^$\d\n]{0,30}(\$?[\d,]+(?:\.\d{2})?)/i);
  const pool = grab(
    /\b(?:lifetime\s+(?:maximum|benefit)|benefit\s+pool|maximum\s+lifetime)\b[^$\d\n]{0,40}(\$?[\d,]+(?:\.\d{2})?)/i,
  );
  const remaining = grab(
    /\b(?:pool\s+)?remaining\b[^$\d\n]{0,40}(\$?[\d,]+(?:\.\d{2})?)|\bbenefits?\s+remaining\b[^$\d\n]{0,40}(\$?[\d,]+(?:\.\d{2})?)/i,
  );
  const premiumMonthly = grab(/\bpremium\b[^$\d\n]{0,30}(\$?[\d,]+(?:\.\d{2})?)\s*(?:per\s+month|\/\s*mo|monthly)/i);
  const premiumAnnual = grab(/\b(?:annual\s+premium|premium\s+(?:per\s+year|annually))\b[^$\d\n]{0,30}(\$?[\d,]+(?:\.\d{2})?)/i);

  const elimMatch = /\belimination\s+period\b[^\d\n]{0,30}(\d{1,3})\s*(?:calendar\s+)?days?/i.exec(markdown);
  const inflationMatch = /\b(\d+%\s*(?:compound|simple)(?:\s+inflation)?|no\s+inflation\s+protection|compound\s+inflation|simple\s+inflation)\b/i.exec(markdown);
  const carrierMatch = /\b(?:carrier|insurer|underwritten\s+by|issued\s+by|company)\b[:\s]+([A-Z][\w&.,'\s-]{2,48})/i.exec(markdown);

  const policyType = /\blong[\s-]term\s+care\b/i.test(markdown)
    ? "Long-term care"
    : /\bwhole\s+life\b/i.test(markdown)
      ? "Whole life"
      : "Insurance policy";

  const inForce = /\bin\s+force\b|\bactive\b|\bpremiums?\s+(are\s+)?current\b/i.test(markdown)
    ? true
    : /\blapsed\b|\bterminated\b|\bcancelled\b/i.test(markdown)
      ? false
      : null;

  const hasAnything =
    daily.value != null ||
    monthly.value != null ||
    pool.value != null ||
    premiumMonthly.value != null ||
    premiumAnnual.value != null;

  if (!hasAnything) return [];

  return [
    {
      policy_type: policyType,
      carrier: carrierMatch ? carrierMatch[1].trim().replace(/[.,]$/, "") : null,
      daily_benefit: daily.value,
      monthly_equivalent:
        monthly.value ?? (daily.value != null ? cents(daily.value * 30.44) : null),
      lifetime_pool: pool.value,
      pool_remaining: remaining.value,
      elimination_period_days: elimMatch ? Number(elimMatch[1]) : null,
      inflation_protection: inflationMatch ? inflationMatch[0] : null,
      premium_monthly: premiumMonthly.value,
      premium_annual: premiumAnnual.value,
      in_force: inForce,
      provenance: {
        where: "Policy summary text",
        page: layout.pages[0]?.pageNumber ?? null,
        snippet: (pool.raw || daily.raw || monthly.raw || "").slice(0, 220),
      },
    },
  ];
}

/**
 * Ledger rows that moved money out of the household.
 *
 * The distinction that matters: a movement between the resident's own accounts
 * is neither income nor a gift, and must not be counted as look-back exposure.
 */
function readTransfers(layout: LayoutResult): Transfer[] {
  const out: Transfer[] = [];

  layout.tables.forEach((table, ti) => {
    const cols = ledgerColumns(table);
    const headers = (table.grid[0] ?? []).map((c) => (c?.content ?? "").toLowerCase());
    const hasDate = headers.some((h) => /\bdate\b|\bposted\b/.test(h));
    const hasMemo = headers.some((h) =>
      /\bdescription\b|\bmemo\b|\bdetails?\b|\bpayee\b|\bnarrative\b/.test(h),
    );
    if (!hasDate && !hasMemo) return;

    for (let r = 1; r < table.grid.length; r++) {
      const row = table.grid[r] ?? [];
      const text = row.map((c) => c?.content ?? "").filter(Boolean).join(" | ");
      if (!text) continue;

      const isTransfer =
        /\btransfer\b|\bwithdrawal\b|\bgift\b|\bcheck\s+#?\d|\bwire\b|\bach\s+debit\b|\bpayment\s+to\b/i.test(
          text,
        );
      if (!isTransfer) continue;

      /*
       * In a ledger the money that moved is in the debit or credit column,
       * never the running balance. Reading the first number in the row would
       * pick up whichever column happens to come first.
       */
      let amount: number | null = null;
      if (cols) {
        for (const index of [cols.debit, cols.credit, cols.amount]) {
          if (index < 0) continue;
          const parsed = parseMoney(row[index]?.content ?? "");
          if (parsed.value != null && parsed.value !== 0) {
            amount = Math.abs(parsed.value);
            break;
          }
        }
      }
      if (amount == null) {
        const amounts = allMoney(text);
        if (!amounts.length) continue;
        amount = Math.abs(amounts[0].value ?? 0) || null;
      }
      if (amount == null) continue;

      const ownAccount = OWN_ACCOUNT_RE.test(text);
      const giftLanguage = GIFT_RE.test(text);
      const relationship = RELATIONSHIP_RE.exec(text);

      // Own-account movement is never a gift, whatever else the memo says.
      const isGift = ownAccount ? false : giftLanguage ? true : null;

      const memoCell =
        cols && cols.description >= 0
          ? row[cols.description]
          : row.find((c) => c && !looksNumeric(c.content) && !findDate(c.content));

      out.push({
        date: cols && cols.date >= 0 ? findDate(row[cols.date]?.content ?? "") : findDate(text),
        amount,
        recipient: ownAccount
          ? "Own account"
          : relationship
            ? relationship[0].replace(/^\w/, (ch) => ch.toUpperCase())
            : null,
        recipient_relationship: ownAccount ? "self" : (relationship?.[0] ?? null),
        memo: memoCell?.content.trim() ?? null,
        is_gift: isGift,
        /*
         * Whether a payment was a gift is a judgement a reviewer makes. What
         * the engine can say is that money left the subject's control and did
         * not land in another of their own accounts, which is the whole set a
         * look-back review has to work through.
         */
        lookback_relevant: !ownAccount,
        provenance: {
          where: `Table ${ti + 1}, row ${r}`,
          page: table.page,
          snippet: text.slice(0, 220),
        },
      });
    }
  });

  return out;
}

/** A lump sum expected on a future date is not a current balance. */
function readTimedProceeds(layout: LayoutResult, markdown: string): TimedProceed[] {
  if (!FUTURE_PROCEED_RE.test(markdown)) return [];

  const out: TimedProceed[] = [];
  const seen = new Set<string>();

  const consider = (text: string, prov: Provenance) => {
    if (!FUTURE_PROCEED_RE.test(text)) return;
    const amounts = allMoney(text);
    if (!amounts.length) return;

    const key = `${amounts[0].value}|${prov.where}`;
    if (seen.has(key)) return;
    seen.add(key);

    const net = /\bnet\b|\bdue\s+to\s+seller\b|\bto\s+seller\b/i.test(text);
    const supersededMatch = SUPERSEDE_RE.test(text) && amounts.length > 1 ? amounts[1] : null;

    out.push({
      description: text.replace(/\s+/g, " ").trim().slice(0, 140),
      gross_amount: net && amounts.length > 1 ? amounts[1].value : amounts[0].value,
      net_amount: net ? amounts[0].value : null,
      expected_date: findDate(text),
      is_estimate: APPROXIMATE_RE.test(text),
      supersedes_amount: supersededMatch?.value ?? null,
      provenance: prov,
    });
  };

  layout.paragraphs.forEach((p, i) => {
    consider(p.content, {
      where: `Page ${p.page ?? "?"}, paragraph ${i + 1}`,
      page: p.page,
      snippet: p.content.slice(0, 220),
    });
  });

  layout.tables.forEach((t, ti) => {
    for (let r = 1; r < t.grid.length; r++) {
      const text = (t.grid[r] ?? []).map((c) => c?.content ?? "").filter(Boolean).join(" | ");
      consider(text, {
        where: `Table ${ti + 1}, row ${r}`,
        page: t.page,
        snippet: text.slice(0, 220),
      });
    }
  });

  return out;
}

function readDocumentType(layout: LayoutResult, markdown: string) {
  const title =
    layout.paragraphs.find((p) => p.role === "title")?.content ??
    layout.paragraphs.find((p) => p.role === "sectionHeading")?.content ??
    "";

  const head = `${title}\n${markdown.slice(0, 1800)}`;

  for (const t of DOC_TYPES) {
    if (t.re.test(head)) return { label: t.label, confidence: t.weight };
  }
  if (title) return { label: title.slice(0, 90), confidence: 0.45 };
  return { label: "Unclassified financial document", confidence: 0.2 };
}

/** Azure joins a letterhead block into one paragraph; keep only the name. */
function firstLine(text: string): string {
  const line = text.split(/\n|\s{2,}|\s+\|\s+/)[0] ?? text;
  const trimmed = line.replace(/\s+/g, " ").trim();
  return trimmed.length > 60 ? `${trimmed.slice(0, 57).trimEnd()}...` : trimmed;
}

/**
 * An issuer block usually runs "Name, N.A." then a street address on the
 * following lines. Keep the first line, and never cut a word in half.
 */
function tidyIssuer(text: string): string {
  const firstLine = text.split(/\r?\n/)[0].replace(/\s+/g, " ").trim();
  if (firstLine.length <= 70) return firstLine;
  const cut = firstLine.slice(0, 70);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 30 ? cut.slice(0, lastSpace) : cut).replace(/[,;:]$/, "");
}

function readIssuer(layout: LayoutResult): string | null {
  const title = layout.paragraphs.find((p) => p.role === "title")?.content;
  const head = layout.paragraphs.slice(0, 6);

  for (const p of head) {
    const text = p.content.trim();
    if (!text || text === title) continue;
    if (/\b(bank|trust|financial|securities|brokerage|insurance|mutual|advisors?|capital|credit\s+union|administration|services|group|company|llc|inc\.?|n\.a\.)\b/i.test(text)) {
      return tidyIssuer(text);
    }
  }
  return title ? tidyIssuer(title) : null;
}

function readPii(markdown: string): string[] {
  const found = new Set<string>();
  for (const sig of PII_SIGNATURES) {
    if (sig.re.test(markdown)) found.add(sig.type);
  }
  return [...found];
}

/* ──────────────────────────────── assembly ─────────────────────────────── */

function toMonthly(c: Candidate): { monthly: number | null; annual: number | null; converted: boolean } {
  const v = c.amount.value;
  if (v == null) return { monthly: null, annual: null, converted: false };

  /*
   * The column header is not the only place a period is stated. "Projected
   * annual property tax disbursement" under a column headed "Amount" is a
   * yearly figure, and reading it as monthly overstates it twelvefold.
   */
  const annual = c.kind === "annual" || /\bannual(ly)?\b|\byearly\b|\bper\s+year\b|\ba\s+year\b/i.test(c.label);
  if (annual) return { monthly: cents(v / 12), annual: v, converted: true };
  return { monthly: v, annual: null, converted: false };
}

export function extractFields(layout: LayoutResult, filename: string): Extraction {
  const markdown = layout.markdown;
  const tableCandidates = fromTables(layout);
  const ledgerCandidates = fromLedgers(layout);
  const paragraphCandidates = fromParagraphs(layout);
  const candidates = [...tableCandidates, ...ledgerCandidates, ...paragraphCandidates];

  const accounts: Account[] = [];
  const liabilities: Liability[] = [];
  const income: IncomeStream[] = [];
  const expenses: Expense[] = [];
  const warnings: Finding[] = [];

  const statedTotals: Extraction["totals"] = {
    total_liquid_assets: null,
    total_assets_including_illiquid: null,
    total_liabilities: null,
    net_position: null,
    total_monthly_income: null,
    total_monthly_expenses: null,
    totals_are_stated_in_document: false,
  };

  const seen = new Set<string>();

  for (const c of candidates) {
    const key = `${c.label.toLowerCase()}|${c.amount.value}|${c.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const isSubtotal = SUBTOTAL_RE.test(c.label);
    const verdict = classify(c);

    // Capture the document's own totals while they pass through.
    if (isSubtotal && c.amount.value != null) {
      const text = c.label.toLowerCase();
      statedTotals.totals_are_stated_in_document = true;
      if (/\bliquid\b/.test(text)) statedTotals.total_liquid_assets ??= c.amount.value;
      else if (/\bnet\s+worth\b|\bnet\s+position\b/.test(text)) statedTotals.net_position ??= c.amount.value;
      else if (/\b(liabilit|debt|owed|payable)/.test(text)) statedTotals.total_liabilities ??= c.amount.value;
      else if (/\bincome\b/.test(text)) statedTotals.total_monthly_income ??= c.amount.value;
      else if (/\bexpense\b|\bcost\b/.test(text)) statedTotals.total_monthly_expenses ??= c.amount.value;
      else if (/\basset|\bdeposit/.test(text)) statedTotals.total_assets_including_illiquid ??= c.amount.value;
    }

    if (verdict.bucket === "none") continue;

    const owner = c.extra["owner"] ?? c.extra["registration"] ?? c.extra["account holder"] ?? null;
    const asOf = findDate(c.context) ?? null;

    if (verdict.bucket === "liability") {
      const v = c.amount.value;
      liabilities.push({
        label: c.label.slice(0, 90),
        creditor: c.extra["creditor"] ?? c.extra["lender"] ?? c.extra["institution"] ?? null,
        liability_type: verdict.liabilityType ?? "other",
        masked_number: findMasked(c.context),
        owner,
        // Debts are recorded positive whichever sign the document used.
        outstanding_balance: v == null ? null : Math.abs(v),
        monthly_payment: parseMoney(
          c.extra["monthly payment"] ?? c.extra["payment"] ?? c.extra["minimum payment"] ?? "",
        ).value,
        interest_rate: parsePercent(c.context),
        secured_against: c.extra["collateral"] ?? c.extra["secured by"] ?? c.extra["property"] ?? null,
        as_of: asOf,
        is_subtotal: isSubtotal,
        confidence: Math.min(0.97, verdict.score),
        provenance: c.provenance,
      });
      continue;
    }

    if (verdict.bucket === "asset") {
      const v = c.amount.value;

      // A negative balance in an asset column is a debt, not a negative asset.
      if (v != null && v < 0) {
        liabilities.push({
          label: c.label.slice(0, 90),
          creditor: c.extra["institution"] ?? null,
          liability_type: /\bmargin\b|\bsweep\b/i.test(c.context) ? "margin_loan" : "other",
          masked_number: findMasked(c.context),
          owner,
          outstanding_balance: Math.abs(v),
          monthly_payment: null,
          interest_rate: parsePercent(c.context),
          secured_against: null,
          as_of: asOf,
          is_subtotal: isSubtotal,
          confidence: 0.8,
          provenance: c.provenance,
        });
        warnings.push({
          severity: "caution",
          message: `"${c.label.slice(0, 60)}" carries a negative balance of ${Math.abs(v).toLocaleString("en-US", { style: "currency", currency: "USD" })}. It has been recorded as an obligation rather than a negative asset. Source: ${c.provenance.where}.`,
        });
        continue;
      }

      accounts.push({
        label: c.label.slice(0, 90),
        institution: c.extra["institution"] ?? c.extra["custodian"] ?? c.extra["bank"] ?? null,
        account_type: verdict.assetType ?? "other",
        masked_number: findMasked(c.context),
        owner,
        balance: c.amount.unknown ? null : v,
        liquidity: verdict.liquidity ?? "unknown",
        as_of: asOf,
        is_subtotal: isSubtotal,
        confidence: Math.min(0.97, verdict.score),
        provenance: c.provenance,
      });

      if (c.amount.unknown) {
        warnings.push({
          severity: "caution",
          message: `"${c.label.slice(0, 60)}" is listed without a figure. It is recorded as unknown, not zero, and needs a value before any total is relied on. Source: ${c.provenance.where}.`,
        });
      }
      continue;
    }

    if (verdict.bucket === "income") {
      if (isSubtotal) continue;
      const { monthly, annual, converted } = toMonthly(c);
      const conditional = CONDITIONAL_RE.test(c.context);
      const survivorMatch = /\b(\d{2,3})\s*%\s*(?:survivor|joint|continuation)/i.exec(c.context);

      income.push({
        source: (verdict.normalised ?? c.label).slice(0, 90),
        owner,
        monthly_amount: monthly,
        annual_amount: annual,
        converted_from_annual: converted,
        is_net_of_deductions: NET_RE.test(c.context),
        has_cola: COLA_RE.test(c.context) ? true : null,
        survivor_percentage: survivorMatch ? Number(survivorMatch[1]) : null,
        is_conditional: conditional,
        notes: c.label === verdict.normalised ? null : c.context.slice(0, 160),
        confidence: Math.min(0.97, verdict.score),
        provenance: c.provenance,
      });

      if (conditional) {
        warnings.push({
          severity: "info",
          message: `"${(verdict.normalised ?? c.label).slice(0, 60)}" is payable only on a future contingency and is held out of the monthly income total. Source: ${c.provenance.where}.`,
        });
      }
      continue;
    }

    if (verdict.bucket === "expense") {
      if (isSubtotal) continue;
      const { monthly } = toMonthly(c);
      expenses.push({
        category: (verdict.normalised ?? c.label).slice(0, 90),
        monthly_amount: monthly,
        is_approximate: c.amount.approximate || APPROXIMATE_RE.test(c.context),
        confidence: Math.min(0.97, verdict.score),
        provenance: c.provenance,
      });
    }
  }

  const insurance = readInsurance(markdown, layout);
  const transfers = readTransfers(layout);
  const timedProceeds = readTimedProceeds(layout, markdown);
  const docType = readDocumentType(layout, markdown);

  /* ── cross-checks a reviewer should see ────────────────────────────────── */

  const derivedAssets = accounts
    .filter((a) => !a.is_subtotal && a.balance != null)
    .reduce((n, a) => n + (a.balance ?? 0), 0);

  if (
    statedTotals.total_assets_including_illiquid != null &&
    Math.abs(statedTotals.total_assets_including_illiquid - derivedAssets) > 1
  ) {
    warnings.push({
      severity: "conflict",
      message: `The document states total assets of ${statedTotals.total_assets_including_illiquid.toLocaleString("en-US", { style: "currency", currency: "USD" })}, but the individual lines sum to ${derivedAssets.toLocaleString("en-US", { style: "currency", currency: "USD" })}. Neither figure has been preferred; both are shown so a reviewer can decide which is right.`,
    });
  }

  if (SUPERSEDE_RE.test(markdown)) {
    warnings.push({
      severity: "caution",
      message:
        "This document contains language indicating a figure has been amended, revised or superseded. Confirm which version is operative before relying on any amount.",
    });
  }

  if (accounts.some((a) => a.is_subtotal)) {
    warnings.push({
      severity: "info",
      message: `${accounts.filter((a) => a.is_subtotal).length} line(s) were identified as subtotals of other lines and excluded from the asset total to avoid double-counting.`,
    });
  }

  const familyPrepared = FAMILY_PREPARED_RE.test(markdown);
  if (familyPrepared) {
    warnings.push({
      severity: "caution",
      message:
        "This document appears to have been prepared by a family member rather than an institution. Treat its figures as unverified assertions until supporting statements are produced.",
    });
  }

  if (!accounts.length && !liabilities.length && !income.length && !expenses.length) {
    warnings.push({
      severity: "caution",
      message:
        "No labelled financial figures were recognised. The layout evidence is intact, so this is a gap in the extraction lexicon rather than a reading failure. Review the Markdown and Tables tabs directly.",
    });
  }

  /* ── confidence ─────────────────────────────────────────────────────────── */

  const lineConfidences = [
    ...accounts.map((a) => a.confidence),
    ...liabilities.map((l) => l.confidence),
    ...income.map((s) => s.confidence),
    ...expenses.map((e) => e.confidence),
  ];
  const meanConfidence = lineConfidences.length
    ? lineConfidences.reduce((a, b) => a + b, 0) / lineConfidences.length
    : 0;

  const conflicts = warnings.filter((w) => w.severity === "conflict").length;
  const overall = Math.max(
    0.05,
    Math.min(0.95, meanConfidence * docType.confidence - conflicts * 0.1),
  );

  const parts: string[] = [];
  parts.push(
    `Read ${layout.pageCount} page${layout.pageCount === 1 ? "" : "s"} containing ${layout.tableCount} reconstructed table${layout.tableCount === 1 ? "" : "s"} and ${layout.paragraphCount} paragraphs.`,
  );
  parts.push(
    `${tableCandidates.length} labelled figure${tableCandidates.length === 1 ? "" : "s"} came from balance tables, ${ledgerCandidates.length} from transaction ledgers and ${paragraphCandidates.length} from sentence text.`,
  );
  if (ledgerCandidates.length) {
    parts.push(
      "Ledger amounts are observations from a single statement period, not proven recurring figures.",
    );
  }
  if (accounts.length || liabilities.length) {
    parts.push(
      `Classified ${accounts.length} asset line${accounts.length === 1 ? "" : "s"} and ${liabilities.length} liability line${liabilities.length === 1 ? "" : "s"}.`,
    );
  }
  if (accounts.some((a) => a.is_subtotal) || liabilities.some((l) => l.is_subtotal)) {
    parts.push("Subtotal rows were detected and excluded from the sums.");
  }
  if (transfers.some((t) => t.is_gift === false)) {
    parts.push("At least one movement is between the subject's own accounts and is recorded as neither income nor a gift.");
  }
  if (timedProceeds.length) {
    parts.push("A future-dated lump sum was recorded separately from current balances.");
  }

  return {
    document_type: docType.label,
    document_type_confidence: docType.confidence,
    issuer: readIssuer(layout),
    statement_period: findPeriod(markdown),
    document_date: findDate(markdown.slice(0, 800)),
    is_family_prepared: familyPrepared,
    accounts,
    liabilities,
    income_streams: income,
    expenses,
    insurance,
    transfers,
    timed_proceeds: timedProceeds,
    totals: statedTotals,
    pii_types_detected: readPii(markdown),
    warnings,
    overall_confidence: Math.round(overall * 100) / 100,
    reasoning_summary: parts.join(" "),
    sources: {
      tables: tableCandidates.length,
      ledgers: ledgerCandidates.length,
      paragraphs: paragraphCandidates.length,
    },
  };
}
