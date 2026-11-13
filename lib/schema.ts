/**
 * The candidate-field shape produced from an Azure layout analysis.
 *
 * Everything here is a *proposal* for a human reviewer. Nothing in this file
 * decides anything: no risk tier, no eligibility, no recommendation.
 */

export type AccountType =
  | "checking"
  | "savings"
  | "certificate_of_deposit"
  | "money_market"
  | "brokerage"
  | "retirement"
  | "annuity"
  | "trust"
  | "real_property"
  | "life_insurance_cash_value"
  | "personal_property"
  | "other";

export type Liquidity = "liquid" | "partial" | "illiquid" | "unknown";

export type LiabilityType =
  | "mortgage"
  | "home_equity_line"
  | "auto_loan"
  | "personal_loan"
  | "credit_card"
  | "medical_debt"
  | "tax_liability"
  | "reverse_mortgage"
  | "lien"
  | "margin_loan"
  | "other";

/** Where in the Azure response a value was found. Every line carries one. */
export type Provenance = {
  /** "table 2, row 4" / "page 1, paragraph 12" */
  where: string;
  page: number | null;
  /** The exact text the value was read from. */
  snippet: string;
};

export type Account = {
  label: string;
  institution: string | null;
  account_type: AccountType;
  masked_number: string | null;
  owner: string | null;
  /** Null when not stated. Never 0 as a stand-in for unknown. */
  balance: number | null;
  liquidity: Liquidity;
  as_of: string | null;
  /** True when this line sums other lines on the same document. */
  is_subtotal: boolean;
  confidence: number;
  provenance: Provenance;
};

export type Liability = {
  label: string;
  creditor: string | null;
  liability_type: LiabilityType;
  masked_number: string | null;
  owner: string | null;
  /** Amount still owed, always positive. Null when not stated. */
  outstanding_balance: number | null;
  monthly_payment: number | null;
  /** Annual percentage, e.g. 6.25 for 6.25%. */
  interest_rate: number | null;
  secured_against: string | null;
  as_of: string | null;
  is_subtotal: boolean;
  confidence: number;
  provenance: Provenance;
};

export type IncomeStream = {
  source: string;
  owner: string | null;
  monthly_amount: number | null;
  annual_amount: number | null;
  converted_from_annual: boolean;
  is_net_of_deductions: boolean;
  has_cola: boolean | null;
  survivor_percentage: number | null;
  /** Payable only on a future contingency: not current income. */
  is_conditional: boolean;
  notes: string | null;
  confidence: number;
  provenance: Provenance;
};

export type Expense = {
  category: string;
  monthly_amount: number | null;
  is_approximate: boolean;
  confidence: number;
  provenance: Provenance;
};

export type InsurancePolicy = {
  policy_type: string;
  carrier: string | null;
  daily_benefit: number | null;
  monthly_equivalent: number | null;
  /** Maximum lifetime benefit. COVERAGE, not an asset. */
  lifetime_pool: number | null;
  pool_remaining: number | null;
  elimination_period_days: number | null;
  inflation_protection: string | null;
  premium_monthly: number | null;
  premium_annual: number | null;
  in_force: boolean | null;
  provenance: Provenance;
};

export type Transfer = {
  date: string | null;
  amount: number | null;
  recipient: string | null;
  recipient_relationship: string | null;
  memo: string | null;
  /** A transfer between the subject's own accounts is never a gift. */
  is_gift: boolean | null;
  lookback_relevant: boolean;
  provenance: Provenance;
};

export type TimedProceed = {
  description: string;
  gross_amount: number | null;
  net_amount: number | null;
  expected_date: string | null;
  is_estimate: boolean;
  supersedes_amount: number | null;
  provenance: Provenance;
};

export type Totals = {
  total_liquid_assets: number | null;
  total_assets_including_illiquid: number | null;
  total_liabilities: number | null;
  net_position: number | null;
  total_monthly_income: number | null;
  total_monthly_expenses: number | null;
  /** False when these were summed here rather than printed on the document. */
  totals_are_stated_in_document: boolean;
};

export type Finding = {
  severity: "info" | "caution" | "conflict";
  message: string;
};

export type Extraction = {
  document_type: string;
  document_type_confidence: number;
  issuer: string | null;
  statement_period: string | null;
  document_date: string | null;
  is_family_prepared: boolean;
  accounts: Account[];
  liabilities: Liability[];
  income_streams: IncomeStream[];
  expenses: Expense[];
  insurance: InsurancePolicy[];
  transfers: Transfer[];
  timed_proceeds: TimedProceed[];
  totals: Totals;
  /** TYPES only, e.g. "full name". Never the values themselves. */
  pii_types_detected: string[];
  warnings: Finding[];
  overall_confidence: number;
  reasoning_summary: string;
  /** How many candidate lines each source contributed. */
  sources: { tables: number; ledgers: number; paragraphs: number };
};
