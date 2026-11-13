/**
 * Derives a reviewable financial position from the extracted candidate fields.
 *
 * Two rules drive everything here:
 *   1. A line marked `is_subtotal` is never added: it already sums other lines.
 *   2. A null amount stays null. It is never coerced to 0, and anything that
 *      could not be valued is surfaced as an unvalued count instead.
 */

import type { Extraction } from "./schema";

export type LiquidityBand = "liquid" | "partial" | "illiquid" | "unknown";

export type Position = {
  assets: {
    total: number;
    byLiquidity: Record<LiquidityBand, number>;
    counted: number;
    unvalued: number;
    subtotalsSkipped: number;
  };
  liabilities: {
    total: number;
    counted: number;
    unvalued: number;
    subtotalsSkipped: number;
    monthlyDebtService: number;
  };
  netPosition: number;
  cashflow: {
    monthlyIncome: number;
    monthlyExpenses: number;
    net: number;
    conditionalIncome: number;
    incomeCounted: number;
    expensesCounted: number;
  };
  coverage: {
    lifetimePool: number;
    poolRemaining: number;
    monthlyBenefit: number;
    policies: number;
  };
  lookback: {
    giftTotal: number;
    flaggedCount: number;
  };
  timedProceeds: {
    total: number;
    count: number;
  };
  statedTotals: Extraction["totals"];
  /** 0-1. Share of amount-bearing lines that actually carried a number. */
  completeness: number;
  findings: {
    conflicts: number;
    cautions: number;
    infos: number;
  };
};

const add = (a: number, b: number | null | undefined) => (b == null ? a : a + b);

export function derivePosition(x: Extraction): Position {
  // ---- assets -------------------------------------------------------------
  const byLiquidity: Record<LiquidityBand, number> = {
    liquid: 0,
    partial: 0,
    illiquid: 0,
    unknown: 0,
  };

  let assetTotal = 0;
  let assetCounted = 0;
  let assetUnvalued = 0;
  let assetSubtotals = 0;

  for (const a of x.accounts) {
    if (a.is_subtotal) {
      assetSubtotals++;
      continue;
    }
    if (a.balance == null) {
      assetUnvalued++;
      continue;
    }
    assetTotal += a.balance;
    byLiquidity[a.liquidity] += a.balance;
    assetCounted++;
  }

  // ---- liabilities --------------------------------------------------------
  let liabilityTotal = 0;
  let liabilityCounted = 0;
  let liabilityUnvalued = 0;
  let liabilitySubtotals = 0;
  let monthlyDebtService = 0;

  for (const l of x.liabilities) {
    if (l.is_subtotal) {
      liabilitySubtotals++;
      continue;
    }
    monthlyDebtService = add(monthlyDebtService, l.monthly_payment);
    if (l.outstanding_balance == null) {
      liabilityUnvalued++;
      continue;
    }
    // Balances owed are always recorded positive.
    liabilityTotal += Math.abs(l.outstanding_balance);
    liabilityCounted++;
  }

  // ---- cashflow -----------------------------------------------------------
  let monthlyIncome = 0;
  let conditionalIncome = 0;
  let incomeCounted = 0;

  for (const s of x.income_streams) {
    const monthly =
      s.monthly_amount ?? (s.annual_amount != null ? s.annual_amount / 12 : null);
    if (monthly == null) continue;
    if (s.is_conditional) {
      conditionalIncome += monthly;
      continue;
    }
    monthlyIncome += monthly;
    incomeCounted++;
  }

  let monthlyExpenses = 0;
  let expensesCounted = 0;
  for (const e of x.expenses) {
    if (e.monthly_amount == null) continue;
    monthlyExpenses += e.monthly_amount;
    expensesCounted++;
  }

  // ---- coverage (never an asset) -----------------------------------------
  let lifetimePool = 0;
  let poolRemaining = 0;
  let monthlyBenefit = 0;
  for (const p of x.insurance) {
    lifetimePool = add(lifetimePool, p.lifetime_pool);
    poolRemaining = add(poolRemaining, p.pool_remaining);
    monthlyBenefit = add(
      monthlyBenefit,
      p.monthly_equivalent ?? (p.daily_benefit != null ? p.daily_benefit * 30.44 : null),
    );
  }

  // ---- look-back exposure -------------------------------------------------
  let giftTotal = 0;
  let flaggedCount = 0;
  for (const t of x.transfers) {
    if (!t.lookback_relevant && !t.is_gift) continue;
    flaggedCount++;
    giftTotal = add(giftTotal, t.amount);
  }

  // ---- future proceeds ----------------------------------------------------
  let proceedTotal = 0;
  for (const p of x.timed_proceeds) {
    proceedTotal = add(proceedTotal, p.net_amount ?? p.gross_amount);
  }

  // ---- completeness -------------------------------------------------------
  const valueBearing =
    x.accounts.length +
    x.liabilities.length +
    x.income_streams.length +
    x.expenses.length;
  const valued =
    x.accounts.filter((a) => a.balance != null).length +
    x.liabilities.filter((l) => l.outstanding_balance != null).length +
    x.income_streams.filter((s) => s.monthly_amount != null || s.annual_amount != null)
      .length +
    x.expenses.filter((e) => e.monthly_amount != null).length;

  const findings = { conflicts: 0, cautions: 0, infos: 0 };
  for (const w of x.warnings) {
    if (w.severity === "conflict") findings.conflicts++;
    else if (w.severity === "caution") findings.cautions++;
    else findings.infos++;
  }

  return {
    assets: {
      total: assetTotal,
      byLiquidity,
      counted: assetCounted,
      unvalued: assetUnvalued,
      subtotalsSkipped: assetSubtotals,
    },
    liabilities: {
      total: liabilityTotal,
      counted: liabilityCounted,
      unvalued: liabilityUnvalued,
      subtotalsSkipped: liabilitySubtotals,
      monthlyDebtService,
    },
    netPosition: assetTotal - liabilityTotal,
    cashflow: {
      monthlyIncome,
      monthlyExpenses,
      net: monthlyIncome - monthlyExpenses,
      conditionalIncome,
      incomeCounted,
      expensesCounted,
    },
    coverage: {
      lifetimePool,
      poolRemaining,
      monthlyBenefit,
      policies: x.insurance.length,
    },
    lookback: { giftTotal, flaggedCount },
    timedProceeds: { total: proceedTotal, count: x.timed_proceeds.length },
    statedTotals: x.totals,
    completeness: valueBearing === 0 ? 1 : valued / valueBearing,
    findings,
  };
}

// ---------------------------------------------------------------- formatting

export function money(n: number | null | undefined, opts?: { cents?: boolean }): string {
  if (n == null) return "-";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts?.cents ? 2 : 0,
    maximumFractionDigits: opts?.cents ? 2 : 0,
  });
}

export function compactMoney(n: number | null | undefined): string {
  if (n == null) return "-";
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
}

export function num(n: number | null | undefined): string {
  if (n == null) return "-";
  return n.toLocaleString("en-US");
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

const LABELS: Record<string, string> = {
  certificate_of_deposit: "Certificate of deposit",
  money_market: "Money market",
  life_insurance_cash_value: "Life insurance cash value",
  real_property: "Real property",
  personal_property: "Personal property",
  home_equity_line: "Home equity line",
  auto_loan: "Auto loan",
  personal_loan: "Personal loan",
  credit_card: "Credit card",
  medical_debt: "Medical debt",
  tax_liability: "Tax liability",
  reverse_mortgage: "Reverse mortgage",
  margin_loan: "Margin loan",
};

export function label(key: string): string {
  if (LABELS[key]) return LABELS[key];
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
