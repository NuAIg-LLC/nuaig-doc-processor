"use client";

import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  CreditCard,
  Gift,
  Info,
  Landmark,
  Lock,
  Receipt,
  Scale,
  ShieldHalf,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRoundSearch,
  Wallet,
} from "lucide-react";

import {
  Card,
  CountUp,
  Empty,
  MeterBar,
  Pill,
  Ring,
  SectionTitle,
  riseIn,
  stagger,
} from "../ui";
import {
  compactMoney,
  derivePosition,
  label,
  money,
  num,
  pct,
  type LiquidityBand,
} from "@/lib/finance";
import type { Extraction } from "@/lib/schema";

/* ─────────────────────────────── hero metric ───────────────────────────── */

function Headline({
  title,
  value,
  sub,
  colour,
  icon: Icon,
  trend,
  delay,
}: {
  title: string;
  value: number;
  sub: React.ReactNode;
  colour: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  trend?: "up" | "down";
  delay: number;
}) {
  const Trend = trend === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <motion.div variants={riseIn}>
      <Card className="h-full p-5">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${colour}, transparent)`,
          }}
        />
        <div className="mb-3.5 flex items-center gap-2.5">
          <span
            className="grid h-8 w-8 place-items-center rounded-xl"
            style={{
              background: `color-mix(in oklab, ${colour} 15%, transparent)`,
              color: colour,
            }}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted">
            {title}
          </p>
          {trend && (
            <Trend className="ml-auto h-4 w-4" strokeWidth={2.4} style={{ color: colour }} />
          )}
        </div>

        <p
          className="text-[30px] font-semibold leading-none tracking-[-0.035em] sm:text-[34px]"
          style={{ color: colour }}
        >
          <CountUp value={value} format={(n) => money(n)} duration={1 + delay} />
        </p>
        <div className="mt-2.5 text-[12px] leading-snug text-muted">{sub}</div>
      </Card>
    </motion.div>
  );
}

/* ───────────────────────────── composition bars ────────────────────────── */

const BAND_COLOUR: Record<LiquidityBand, string> = {
  liquid: "var(--asset)",
  partial: "var(--brand-2)",
  illiquid: "var(--brand)",
  unknown: "var(--muted)",
};

const BAND_NOTE: Record<LiquidityBand, string> = {
  liquid: "Spendable now",
  partial: "Penalty or delay to access",
  illiquid: "Requires a sale or settlement",
  unknown: "Liquidity not stated",
};

function Composition({ x }: { x: Extraction }) {
  const p = derivePosition(x);
  const bands = (Object.keys(p.assets.byLiquidity) as LiquidityBand[]).filter(
    (b) => p.assets.byLiquidity[b] !== 0,
  );

  const debtByType = new Map<string, number>();
  for (const l of x.liabilities) {
    if (l.is_subtotal || l.outstanding_balance == null) continue;
    const key = l.liability_type;
    debtByType.set(key, (debtByType.get(key) ?? 0) + Math.abs(l.outstanding_balance));
  }
  const debts = [...debtByType.entries()].sort((a, b) => b[1] - a[1]);

  const scale = Math.max(p.assets.total, p.liabilities.total, 1);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <motion.div variants={riseIn}>
        <Card className="h-full p-5">
          <SectionTitle icon={Wallet}>Assets by liquidity</SectionTitle>
          {bands.length === 0 ? (
            <Empty icon={Wallet}>No valued asset lines on this document.</Empty>
          ) : (
            <div className="flex flex-col gap-3.5">
              {bands.map((b, i) => (
                <div key={b}>
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="text-[13px] font-medium capitalize">{b}</span>
                    <span className="text-[11.5px] text-muted">{BAND_NOTE[b]}</span>
                    <span className="ml-auto font-mono text-[13px] tnum">
                      {money(p.assets.byLiquidity[b])}
                    </span>
                  </div>
                  <MeterBar
                    value={p.assets.byLiquidity[b]}
                    max={scale}
                    colour={BAND_COLOUR[b]}
                    delay={i * 0.07}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div variants={riseIn}>
        <Card className="h-full p-5">
          <SectionTitle icon={CreditCard}>Liabilities by type</SectionTitle>
          {debts.length === 0 ? (
            <Empty icon={BadgeCheck}>
              No outstanding obligations were found on this document.
            </Empty>
          ) : (
            <div className="flex flex-col gap-3.5">
              {debts.map(([type, amount], i) => (
                <div key={type}>
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="text-[13px] font-medium">{label(type)}</span>
                    <span className="ml-auto font-mono text-[13px] tnum">{money(amount)}</span>
                  </div>
                  <MeterBar value={amount} max={scale} colour="var(--debt)" delay={i * 0.07} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

/* ──────────────────────────────── line tables ──────────────────────────── */

function Accounts({ x }: { x: Extraction }) {
  if (!x.accounts.length) {
    return <Empty icon={Landmark}>No asset accounts were identified.</Empty>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="doc-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Institution</th>
            <th>Type</th>
            <th>Owner</th>
            <th>Liquidity</th>
            <th>As of</th>
            <th>Found in</th>
            <th className="text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {x.accounts.map((a, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.035, 0.5), duration: 0.3 }}
              title={`${a.provenance.where}: ${a.provenance.snippet}`}
              style={
                a.is_subtotal
                  ? { background: "color-mix(in oklab, var(--warn) 8%, transparent)" }
                  : undefined
              }
            >
              <td>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{a.label}</span>
                  {a.is_subtotal && <Pill tone="warn">subtotal</Pill>}
                </div>
                {a.masked_number && (
                  <span className="font-mono text-[11px] text-muted">{a.masked_number}</span>
                )}
              </td>
              <td className="text-ink-2">{a.institution ?? "-"}</td>
              <td className="text-ink-2">{label(a.account_type)}</td>
              <td className="text-ink-2">{a.owner ?? "-"}</td>
              <td>
                <Pill
                  tone={
                    a.liquidity === "liquid"
                      ? "asset"
                      : a.liquidity === "illiquid"
                        ? "brand"
                        : "neutral"
                  }
                >
                  {a.liquidity}
                </Pill>
              </td>
              <td className="text-muted">{a.as_of ?? "-"}</td>
              <td className="whitespace-nowrap font-mono text-[11px] text-faint">
                {a.provenance.where}
              </td>
              <td
                className="numeric font-medium"
                style={{
                  color: a.balance == null ? "var(--faint)" : "var(--asset)",
                }}
              >
                {money(a.balance, { cents: true })}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Liabilities({ x }: { x: Extraction }) {
  if (!x.liabilities.length) {
    return (
      <Empty icon={BadgeCheck}>
        No debts, liens or outstanding obligations appear on this document.
      </Empty>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="doc-table">
        <thead>
          <tr>
            <th>Obligation</th>
            <th>Creditor</th>
            <th>Type</th>
            <th>Secured against</th>
            <th className="text-right">Rate</th>
            <th className="text-right">Monthly</th>
            <th>Found in</th>
            <th className="text-right">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {x.liabilities.map((l, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.035, 0.5), duration: 0.3 }}
              title={`${l.provenance.where}: ${l.provenance.snippet}`}
              style={
                l.is_subtotal
                  ? { background: "color-mix(in oklab, var(--warn) 8%, transparent)" }
                  : undefined
              }
            >
              <td>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{l.label}</span>
                  {l.is_subtotal && <Pill tone="warn">subtotal</Pill>}
                </div>
                {l.masked_number && (
                  <span className="font-mono text-[11px] text-muted">{l.masked_number}</span>
                )}
              </td>
              <td className="text-ink-2">{l.creditor ?? "-"}</td>
              <td className="text-ink-2">{label(l.liability_type)}</td>
              <td className="text-ink-2">{l.secured_against ?? "-"}</td>
              <td className="numeric text-ink-2">
                {l.interest_rate == null ? "-" : `${l.interest_rate}%`}
              </td>
              <td className="numeric text-ink-2">{money(l.monthly_payment, { cents: true })}</td>
              <td className="whitespace-nowrap font-mono text-[11px] text-faint">
                {l.provenance.where}
              </td>
              <td
                className="numeric font-medium"
                style={{
                  color: l.outstanding_balance == null ? "var(--faint)" : "var(--debt)",
                }}
              >
                {money(l.outstanding_balance, { cents: true })}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cashflow({ x }: { x: Extraction }) {
  const p = derivePosition(x);
  const scale = Math.max(p.cashflow.monthlyIncome, p.cashflow.monthlyExpenses, 1);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <motion.div variants={riseIn}>
        <Card className="h-full p-5">
          <SectionTitle
            icon={TrendingUp}
            right={
              <span className="font-mono text-[13px] tnum" style={{ color: "var(--asset)" }}>
                {money(p.cashflow.monthlyIncome)}/mo
              </span>
            }
          >
            Monthly income
          </SectionTitle>

          {x.income_streams.length === 0 ? (
            <Empty icon={Banknote}>No income streams were identified.</Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {x.income_streams.map((s, i) => {
                const monthly =
                  s.monthly_amount ??
                  (s.annual_amount != null ? s.annual_amount / 12 : null);
                return (
                  <div key={i}>
                    <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[13px] font-medium">{s.source}</span>
                      {s.owner && <span className="text-[11.5px] text-muted">{s.owner}</span>}
                      {s.is_conditional && <Pill tone="warn">conditional</Pill>}
                      {s.converted_from_annual && <Pill tone="neutral">from annual</Pill>}
                      {s.is_net_of_deductions && <Pill tone="neutral">net</Pill>}
                      {s.has_cola && <Pill tone="brand">COLA</Pill>}
                      <span className="ml-auto font-mono text-[13px] tnum">
                        {money(monthly, { cents: true })}
                      </span>
                    </div>
                    <MeterBar
                      value={s.is_conditional ? 0 : (monthly ?? 0)}
                      max={scale}
                      colour={s.is_conditional ? "var(--warn)" : "var(--asset)"}
                      delay={i * 0.05}
                      height={6}
                    />
                    {s.notes && (
                      <p className="mt-1 text-[11.5px] leading-snug text-muted">{s.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {p.cashflow.conditionalIncome > 0 && (
            <p
              className="mt-4 rounded-xl px-3 py-2 text-[11.5px] leading-snug"
              style={{
                background: "color-mix(in oklab, var(--warn) 10%, transparent)",
                color: "var(--warn)",
              }}
            >
              {money(p.cashflow.conditionalIncome)}/mo is conditional on a future event and is
              excluded from the income total.
            </p>
          )}
        </Card>
      </motion.div>

      <motion.div variants={riseIn}>
        <Card className="h-full p-5">
          <SectionTitle
            icon={TrendingDown}
            right={
              <span className="font-mono text-[13px] tnum" style={{ color: "var(--debt)" }}>
                {money(p.cashflow.monthlyExpenses)}/mo
              </span>
            }
          >
            Monthly expenses
          </SectionTitle>

          {x.expenses.length === 0 ? (
            <Empty icon={Receipt}>No recurring expenses were identified.</Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {x.expenses.map((e, i) => (
                <div key={i}>
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="text-[13px] font-medium">{e.category}</span>
                    {e.is_approximate && <Pill tone="neutral">approx.</Pill>}
                    <span className="ml-auto font-mono text-[13px] tnum">
                      {money(e.monthly_amount, { cents: true })}
                    </span>
                  </div>
                  <MeterBar
                    value={e.monthly_amount ?? 0}
                    max={scale}
                    colour="var(--debt)"
                    delay={i * 0.05}
                    height={6}
                  />
                </div>
              ))}
            </div>
          )}

          {p.liabilities.monthlyDebtService > 0 && (
            <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-snug text-muted">
              Debt service of{" "}
              <span className="font-mono tnum text-ink-2">
                {money(p.liabilities.monthlyDebtService)}
              </span>
              /mo is listed separately under liabilities: check whether it is already
              included above before adding it.
            </p>
          )}
        </Card>
      </motion.div>
    </div>
  );
}

/* ─────────────────────── coverage, transfers, proceeds ─────────────────── */

function Coverage({ x }: { x: Extraction }) {
  if (!x.insurance.length) return null;
  return (
    <motion.div variants={riseIn}>
      <Card className="p-5">
        <SectionTitle
          icon={ShieldHalf}
          right={<Pill tone="brand">coverage, not an asset</Pill>}
        >
          Insurance
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {x.insurance.map((p, i) => (
            <div key={i} className="rounded-2xl border border-line p-4">
              <div className="mb-2.5 flex items-start gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold">{p.policy_type}</p>
                  {p.carrier && <p className="truncate text-[12px] text-muted">{p.carrier}</p>}
                </div>
                <div className="ml-auto shrink-0">
                  {p.in_force === true && <Pill tone="asset">in force</Pill>}
                  {p.in_force === false && <Pill tone="debt">lapsed</Pill>}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
                {[
                  ["Daily benefit", money(p.daily_benefit, { cents: true })],
                  ["Monthly equiv.", money(p.monthly_equivalent)],
                  ["Lifetime pool", money(p.lifetime_pool)],
                  ["Pool remaining", money(p.pool_remaining)],
                  [
                    "Elimination",
                    p.elimination_period_days == null
                      ? "-"
                      : `${p.elimination_period_days} days`,
                  ],
                  ["Inflation", p.inflation_protection ?? "-"],
                  ["Premium", money(p.premium_monthly ?? p.premium_annual)],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-2">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-mono tnum text-ink-2">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function Transfers({ x }: { x: Extraction }) {
  if (!x.transfers.length) return null;
  return (
    <motion.div variants={riseIn}>
      <Card className="p-5">
        <SectionTitle icon={Gift}>Transfers and look-back exposure</SectionTitle>
        <div className="overflow-x-auto">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Date</th>
                <th className="text-right">Amount</th>
                <th>Recipient</th>
                <th>Relationship</th>
                <th>Memo</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {x.transfers.map((t, i) => (
                <tr
                  key={i}
                  style={
                    t.lookback_relevant
                      ? { background: "color-mix(in oklab, var(--warn) 9%, transparent)" }
                      : undefined
                  }
                >
                  <td className="font-mono text-[12px] text-ink-2">{t.date ?? "-"}</td>
                  <td className="numeric font-medium text-ink">
                    {money(t.amount, { cents: true })}
                  </td>
                  <td className="text-ink-2">{t.recipient ?? "-"}</td>
                  <td className="text-ink-2">{t.recipient_relationship ?? "-"}</td>
                  <td className="text-muted">{t.memo ?? "-"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {t.is_gift === true && <Pill tone="warn">gift</Pill>}
                      {t.is_gift === false && <Pill tone="neutral">not a gift</Pill>}
                      {t.lookback_relevant && <Pill tone="debt">look-back</Pill>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

function Proceeds({ x }: { x: Extraction }) {
  if (!x.timed_proceeds.length) return null;
  return (
    <motion.div variants={riseIn}>
      <Card className="p-5">
        <SectionTitle
          icon={CalendarClock}
          right={<Pill tone="neutral">future: not a current balance</Pill>}
        >
          Expected proceeds
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {x.timed_proceeds.map((p, i) => (
            <div key={i} className="rounded-2xl border border-line p-4">
              <p className="text-[13.5px] font-medium">{p.description}</p>
              <div className="mt-2.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]">
                <span className="text-muted">
                  Gross <span className="font-mono tnum text-ink-2">{money(p.gross_amount)}</span>
                </span>
                <span className="text-muted">
                  Net{" "}
                  <span className="font-mono tnum" style={{ color: "var(--asset)" }}>
                    {money(p.net_amount)}
                  </span>
                </span>
                {p.expected_date && (
                  <span className="text-muted">
                    Expected <span className="text-ink-2">{p.expected_date}</span>
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.is_estimate && <Pill tone="warn">estimate</Pill>}
                {p.supersedes_amount != null && (
                  <Pill tone="debt">supersedes {money(p.supersedes_amount)}</Pill>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

/* ───────────────────────────────── findings ────────────────────────────── */

const SEVERITY = {
  conflict: { tone: "debt" as const, icon: CircleAlert, colour: "var(--debt)" },
  caution: { tone: "warn" as const, icon: AlertTriangle, colour: "var(--warn)" },
  info: { tone: "neutral" as const, icon: Info, colour: "var(--muted)" },
};

function Findings({ x }: { x: Extraction }) {
  if (!x.warnings.length) return null;
  const order = { conflict: 0, caution: 1, info: 2 };
  const sorted = [...x.warnings].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <motion.div variants={riseIn}>
      <Card className="p-5">
        <SectionTitle icon={AlertTriangle}>Reviewer findings</SectionTitle>
        <div className="flex flex-col gap-2">
          {sorted.map((w, i) => {
            const s = SEVERITY[w.severity];
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                className="flex gap-3 rounded-xl p-3"
                style={{ background: `color-mix(in oklab, ${s.colour} 9%, transparent)` }}
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0"
                  strokeWidth={2.2}
                  style={{ color: s.colour }}
                />
                <p className="text-[13px] leading-snug text-ink-2">{w.message}</p>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}

/* ──────────────────────────────── the view ─────────────────────────────── */

export default function Position({ x }: { x: Extraction }) {
  const p = derivePosition(x);
  const cashflowPositive = p.cashflow.net >= 0;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      {/* document identity ------------------------------------------------ */}
      <motion.div variants={riseIn}>
        <Card className="p-5">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <h2 className="text-[19px] font-semibold tracking-[-0.025em]">
                  {x.document_type}
                </h2>
                <Pill tone="brand">
                  {pct(x.document_type_confidence)} type confidence
                </Pill>
                {x.is_family_prepared && <Pill tone="warn">family-prepared</Pill>}
              </div>
              <p className="text-[13px] text-muted">
                {[x.issuer, x.statement_period, x.document_date]
                  .filter(Boolean)
                  .join(" · ") || "No issuer or period stated"}
              </p>
            </div>

            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2.5">
                <Ring value={x.overall_confidence} colour="var(--brand)">
                  <span className="font-mono text-[13px] font-semibold tnum">
                    {pct(x.overall_confidence)}
                  </span>
                </Ring>
                <div className="text-[11.5px] leading-tight">
                  <p className="font-medium text-ink-2">Overall</p>
                  <p className="text-muted">confidence</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Ring value={p.completeness} colour="var(--brand-2)">
                  <span className="font-mono text-[13px] font-semibold tnum">
                    {pct(p.completeness)}
                  </span>
                </Ring>
                <div className="text-[11.5px] leading-tight">
                  <p className="font-medium text-ink-2">Fields</p>
                  <p className="text-muted">carrying a value</p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-4 border-t border-line pt-3.5 text-[13px] leading-relaxed text-ink-2">
            {x.reasoning_summary}
          </p>
        </Card>
      </motion.div>

      {/* headline numbers ------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Headline
          title="Total assets"
          value={p.assets.total}
          colour="var(--asset)"
          icon={Wallet}
          trend="up"
          delay={0}
          sub={
            <>
              {p.assets.counted} valued {p.assets.counted === 1 ? "line" : "lines"}
              {p.assets.subtotalsSkipped > 0 && (
                <> · {p.assets.subtotalsSkipped} subtotal excluded</>
              )}
              {p.assets.unvalued > 0 && <> · {p.assets.unvalued} without a figure</>}
            </>
          }
        />
        <Headline
          title="Total liabilities"
          value={p.liabilities.total}
          colour="var(--debt)"
          icon={CreditCard}
          trend="down"
          delay={0.08}
          sub={
            p.liabilities.counted === 0 ? (
              "None stated on this document"
            ) : (
              <>
                {p.liabilities.counted} valued{" "}
                {p.liabilities.counted === 1 ? "obligation" : "obligations"}
                {p.liabilities.monthlyDebtService > 0 && (
                  <> · {money(p.liabilities.monthlyDebtService)}/mo service</>
                )}
              </>
            )
          }
        />
        <Headline
          title="Net position"
          value={p.netPosition}
          colour="var(--brand)"
          icon={Scale}
          delay={0.16}
          sub={
            p.statedTotals.totals_are_stated_in_document ? (
              <>Document states its own totals: compare before relying on this</>
            ) : (
              <>Summed from line items, not printed on the document</>
            )
          }
        />
        <Headline
          title="Net monthly cashflow"
          value={p.cashflow.net}
          colour={cashflowPositive ? "var(--asset)" : "var(--debt)"}
          icon={cashflowPositive ? TrendingUp : TrendingDown}
          trend={cashflowPositive ? "up" : "down"}
          delay={0.24}
          sub={
            <>
              {money(p.cashflow.monthlyIncome)} in · {money(p.cashflow.monthlyExpenses)} out
            </>
          }
        />
      </div>

      {/* secondary signal strip ------------------------------------------- */}
      {(p.lookback.flaggedCount > 0 ||
        p.coverage.policies > 0 ||
        p.timedProceeds.count > 0 ||
        p.findings.conflicts > 0) && (
        <motion.div variants={riseIn} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {p.lookback.flaggedCount > 0 && (
            <Card className="flex items-center gap-3 p-4" spotlight={false}>
              <Gift className="h-4 w-4 shrink-0" strokeWidth={2.2} style={{ color: "var(--warn)" }} />
              <div className="min-w-0">
                <p className="truncate text-[12px] text-muted">Look-back exposure</p>
                <p className="font-mono text-[15px] font-semibold tnum" style={{ color: "var(--warn)" }}>
                  {compactMoney(p.lookback.giftTotal)}
                  <span className="ml-1.5 text-[11.5px] font-normal text-muted">
                    · {p.lookback.flaggedCount} flagged
                  </span>
                </p>
              </div>
            </Card>
          )}
          {p.coverage.lifetimePool > 0 && (
            <Card className="flex items-center gap-3 p-4" spotlight={false}>
              <ShieldHalf className="h-4 w-4 shrink-0" strokeWidth={2.2} style={{ color: "var(--brand-2)" }} />
              <div className="min-w-0">
                <p className="truncate text-[12px] text-muted">LTC coverage pool</p>
                <p className="font-mono text-[15px] font-semibold tnum" style={{ color: "var(--brand-2)" }}>
                  {compactMoney(p.coverage.poolRemaining || p.coverage.lifetimePool)}
                  <span className="ml-1.5 text-[11.5px] font-normal text-muted">not an asset</span>
                </p>
              </div>
            </Card>
          )}
          {p.timedProceeds.count > 0 && (
            <Card className="flex items-center gap-3 p-4" spotlight={false}>
              <CalendarClock className="h-4 w-4 shrink-0" strokeWidth={2.2} style={{ color: "var(--brand)" }} />
              <div className="min-w-0">
                <p className="truncate text-[12px] text-muted">Expected proceeds</p>
                <p className="font-mono text-[15px] font-semibold tnum" style={{ color: "var(--brand)" }}>
                  {compactMoney(p.timedProceeds.total)}
                  <span className="ml-1.5 text-[11.5px] font-normal text-muted">
                    · {p.timedProceeds.count} pending
                  </span>
                </p>
              </div>
            </Card>
          )}
          {(p.findings.conflicts > 0 || p.findings.cautions > 0) && (
            <Card className="flex items-center gap-3 p-4" spotlight={false}>
              <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={2.2} style={{ color: "var(--debt)" }} />
              <div className="min-w-0">
                <p className="truncate text-[12px] text-muted">Needs a reviewer</p>
                <p className="font-mono text-[15px] font-semibold tnum" style={{ color: "var(--debt)" }}>
                  {p.findings.conflicts + p.findings.cautions}
                  <span className="ml-1.5 text-[11.5px] font-normal text-muted">
                    · {p.findings.conflicts} conflict
                    {p.findings.conflicts === 1 ? "" : "s"}
                  </span>
                </p>
              </div>
            </Card>
          )}
        </motion.div>
      )}

      <Composition x={x} />

      <motion.div variants={riseIn}>
        <Card className="p-5">
          <SectionTitle
            icon={Landmark}
            right={
              <span className="font-mono text-[13px] tnum" style={{ color: "var(--asset)" }}>
                {money(p.assets.total)}
              </span>
            }
          >
            Asset lines
          </SectionTitle>
          <Accounts x={x} />
        </Card>
      </motion.div>

      <motion.div variants={riseIn}>
        <Card className="p-5">
          <SectionTitle
            icon={CreditCard}
            right={
              <span className="font-mono text-[13px] tnum" style={{ color: "var(--debt)" }}>
                {money(p.liabilities.total)}
              </span>
            }
          >
            Liability lines
          </SectionTitle>
          <Liabilities x={x} />
        </Card>
      </motion.div>

      <Cashflow x={x} />
      <Coverage x={x} />
      <Transfers x={x} />
      <Proceeds x={x} />
      <Findings x={x} />

      {/* stated vs derived + provenance ----------------------------------- */}
      <motion.div variants={riseIn} className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle icon={Scale}>Document's own totals</SectionTitle>
          {p.statedTotals.totals_are_stated_in_document ? (
            <p className="mb-3 text-[12.5px] leading-snug text-muted">
              These figures are printed on the document. Any gap against the derived
              column is a discrepancy worth checking.
            </p>
          ) : (
            <p
              className="mb-3 rounded-xl px-3 py-2 text-[12px] leading-snug"
              style={{
                background: "color-mix(in oklab, var(--warn) 10%, transparent)",
                color: "var(--warn)",
              }}
            >
              The document does not print its own totals: everything below was summed
              from the line items.
            </p>
          )}
          <table className="doc-table">
            <thead>
              <tr>
                <th>Measure</th>
                <th className="text-right">Stated</th>
                <th className="text-right">Derived</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Liquid assets", p.statedTotals.total_liquid_assets, p.assets.byLiquidity.liquid],
                  ["All assets", p.statedTotals.total_assets_including_illiquid, p.assets.total],
                  ["Liabilities", p.statedTotals.total_liabilities, p.liabilities.total],
                  ["Net position", p.statedTotals.net_position, p.netPosition],
                  ["Monthly income", p.statedTotals.total_monthly_income, p.cashflow.monthlyIncome],
                  ["Monthly expenses", p.statedTotals.total_monthly_expenses, p.cashflow.monthlyExpenses],
                ] as [string, number | null, number][]
              ).map(([name, stated, derived]) => {
                const gap = stated != null ? Math.abs(stated - derived) : 0;
                const mismatch = stated != null && gap > 1;
                return (
                  <tr key={name}>
                    <td className="font-medium text-ink-2">
                      <div className="flex items-center gap-2">
                        {name}
                        {mismatch && <Pill tone="debt">Δ {money(gap)}</Pill>}
                      </div>
                    </td>
                    <td className="numeric text-ink-2">{money(stated)}</td>
                    <td className="numeric text-ink">{money(derived)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-4">
          {x.pii_types_detected.length > 0 && (
            <Card className="p-5">
              <SectionTitle icon={UserRoundSearch} right={<Lock className="h-3.5 w-3.5 text-muted" />}>
                Identity data detected
              </SectionTitle>
              <p className="mb-3 text-[12.5px] leading-snug text-muted">
                Types only. No name, address, SSN or date of birth is copied into any
                extracted field, and none of these values leave the document.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {x.pii_types_detected.map((t) => (
                  <Pill key={t} tone="neutral">
                    {t}
                  </Pill>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <SectionTitle icon={Sparkles}>How these fields were found</SectionTitle>
            <dl className="grid gap-2 text-[12.5px]">
              {[
                ["Method", "Deterministic rules engine"],
                ["From balance tables", num(x.sources.tables)],
                ["From transaction ledgers", num(x.sources.ledgers)],
                ["From sentence text", num(x.sources.paragraphs)],
                [
                  "Lines proposed",
                  num(
                    x.accounts.length +
                      x.liabilities.length +
                      x.income_streams.length +
                      x.expenses.length +
                      x.insurance.length +
                      x.transfers.length +
                      x.timed_proceeds.length,
                  ),
                ],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="truncate font-mono tnum text-ink-2">{v}</dd>
                </div>
              ))}
            </dl>
            <p
              className="mt-4 rounded-xl px-3 py-2.5 text-[11.5px] leading-relaxed"
              style={{
                background: "color-mix(in oklab, var(--brand) 9%, transparent)",
                color: "var(--ink-2)",
              }}
            >
              Azure AI Document Intelligence reads the document. A rules engine then maps
              the text it returns onto these fields. No language model is involved, so the
              same document always produces the same result and every figure traces back
              to a specific cell or sentence. Hover any line to see which one.
            </p>
            <p
              className="mt-2.5 rounded-xl px-3 py-2.5 text-[11.5px] leading-relaxed"
              style={{
                background: "color-mix(in oklab, var(--warn) 10%, transparent)",
                color: "var(--ink-2)",
              }}
            >
              Every figure above is a <strong>candidate for human verification</strong>.
              This system proposes fields. It does not assign a risk tier, compute a
              funding gap, or recommend an admissions outcome.
            </p>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
