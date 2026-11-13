/**
 * Fixtures 01 to 09: deposit, investment, benefit and settlement documents.
 *
 * Every figure is fictional. Each document is modelled on the real US format a
 * senior living community would actually receive, and each carries at least one
 * deliberate trap that a naive extractor gets wrong.
 */

import { RED, SOFT, usd } from "./layout.mjs";

export const CORE = [
  /* ──────────────────────────────────────────────────────────── 01 bank ── */
  {
    file: "01_bank_statement_meridian.pdf",
    title: "Bank statement",
    category: "Deposit accounts",
    blurb: "Ruled tables, two pages, multiple accounts plus a transaction ledger",
    tests: [
      "sub-account versus total aggregation",
      "look-back transfer detection from a ledger memo",
      "recurring income identified from transaction descriptions",
    ],
    traps: [
      "The $500.00 movement on 08 Jan is between the holder's own accounts. It is neither income nor a gift.",
      "Total on deposit is a sum of the three accounts above it. Adding it to them double-counts $153,222.67.",
      "The Opening Balance column must not be read as the current balance.",
    ],
    expected: {
      liquid_assets: {
        checking: 14282.55,
        savings: 63940.12,
        certificate_of_deposit: 75000.0,
        total_on_deposit: 153222.67,
      },
      monthly_income_observed: { social_security: 2184.0, pension: 1642.5, ira_distribution: 2366.67 },
      lookback_transfers: [
        { date: "2025-12-19", amount: 45000.0, relationship: "daughter", is_gift: true },
      ],
    },
    pii: ["full name", "street address", "account number"],
    build(s) {
      s.letterhead({
        org: "Meridian Trust Bank, N.A.",
        lines: ["1200 Commerce Plaza, Rockville, MD 20850", "Member FDIC  |  Customer service 800-555-0142"],
        title: "Consolidated Account Statement",
        subtitle: "Statement period: January 1, 2026 through January 31, 2026",
      });

      s.kv([
        ["Account holder", "Margaret E. Whitfield"],
        ["Mailing address", "14 Ashfield Lane, Rockville, MD 20850"],
        ["Customer since", "March 1987"],
        ["Statement date", "February 3, 2026"],
      ]);

      s.heading("Account summary");
      s.table({
        columns: [
          { label: "Account", width: 2.6 },
          { label: "Number", width: 1.2 },
          { label: "Opening Balance", width: 1.4, align: "right" },
          { label: "Closing Balance", width: 1.4, align: "right" },
        ],
        rows: [
          ["Everyday Checking", "xxxx-4471", usd(13904.18), usd(14282.55)],
          ["Premier Savings", "xxxx-8820", usd(63716.4), usd(63940.12)],
          ["18-Month Certificate of Deposit", "xxxx-3109", usd(75000.0), usd(75000.0)],
          [
            { text: "Total on deposit", style: "total" },
            { text: "", style: "total" },
            { text: usd(152620.58), style: "total" },
            { text: usd(153222.67), style: "total" },
          ],
        ],
      });

      s.para(
        "The certificate of deposit matures on July 18, 2026. Early withdrawal before maturity incurs a penalty of 180 days of interest.",
        { size: 8.5, color: SOFT },
      );

      s.heading("Transaction detail - Everyday Checking xxxx-4471");
      s.table({
        columns: [
          { label: "Date", width: 1 },
          { label: "Description", width: 3.6 },
          { label: "Debit", width: 1.1, align: "right" },
          { label: "Credit", width: 1.1, align: "right" },
          { label: "Balance", width: 1.2, align: "right" },
        ],
        rows: [
          ["01/03/2026", "SSA TREAS 310 XXSOC SEC DIRECT DEP", "", usd(2184.0), usd(16088.18)],
          ["01/05/2026", "CRESTLINE PENSION ACH CREDIT", "", usd(1642.5), usd(17730.68)],
          ["01/06/2026", "CEDAR GROVE SENIOR LIVING - MONTHLY FEE", usd(1850.0), "", usd(15880.68)],
          ["01/08/2026", "TRANSFER TO OWN SAVINGS xxxx-8820", usd(500.0), "", usd(15380.68)],
          ["01/10/2026", "HARBORVIEW SECURITIES SYSTEMATIC WITHDRAWAL", "", usd(2366.67), usd(17747.35)],
          ["01/12/2026", "BRIGHTPATH HOME CARE SERVICES", usd(1420.0), "", usd(16327.35)],
          ["01/15/2026", "MEDICARE SUPPLEMENT PREMIUM PLAN G", usd(268.0), "", usd(16059.35)],
          ["01/18/2026", "CRESTLINE MUTUAL LTC PREMIUM", usd(336.67), "", usd(15722.68)],
          ["01/22/2026", "VALLEY PHARMACY RX COPAY", usd(312.44), "", usd(15410.24)],
          ["01/26/2026", "UTILITIES - POTOMAC ELECTRIC", usd(187.69), "", usd(15222.55)],
          ["01/29/2026", "CHECK 2841", usd(940.0), "", usd(14282.55)],
        ],
      });

      s.heading("Transaction detail - Premier Savings xxxx-8820");
      s.table({
        columns: [
          { label: "Date", width: 1 },
          { label: "Description", width: 3.6 },
          { label: "Debit", width: 1.1, align: "right" },
          { label: "Credit", width: 1.1, align: "right" },
          { label: "Balance", width: 1.2, align: "right" },
        ],
        rows: [
          ["12/19/2025", "WIRE TRANSFER TO C. WHITFIELD-BRENNAN", usd(45000.0), "", usd(63492.68)],
          [
            "",
            { text: "    Memo: gift to daughter - assistance with home purchase", style: "soft" },
            "",
            "",
            "",
          ],
          ["01/08/2026", "TRANSFER FROM OWN CHECKING xxxx-4471", "", usd(500.0), usd(63716.4)],
          ["01/31/2026", "INTEREST PAID", "", usd(223.72), usd(63940.12)],
        ],
      });

      s.callout(
        "Notice of look-back relevance: transfers of assets for less than fair market value within 60 months of a Medicaid application may affect eligibility. This notice is informational and is not a determination.",
      );

      s.paginate("Meridian Trust Bank - Consolidated Account Statement - Whitfield");
    },
  },

  /* ──────────────────────────────────────────────────── 02 brokerage ── */
  {
    file: "02_brokerage_equity_harborview.pdf",
    title: "Brokerage and equity portfolio statement",
    category: "Investments",
    blurb: "Dense seven-column holdings grid with a negative cash sweep and an allocation band",
    tests: [
      "read the portfolio total from a summary band rather than a table row",
      "negative cash sweep recorded as an obligation, not a negative asset",
      "cost basis column must not be mistaken for market value",
      "quarterly income must not be read as monthly",
    ],
    traps: [
      "The CASH SWEEP line is negative (-$3,775.27). It is a margin debit, which is a liability.",
      "Cost Basis sits immediately left of Market Value. Reading it yields $331,804.12 instead of $412,860.44.",
      "Income this period of $4,286.65 is a quarterly figure, not a monthly one.",
    ],
    expected: {
      portfolio_value: 412860.44,
      beginning_value: 398221.19,
      cash_sweep: -3775.27,
      income_this_quarter: { dividends: 2884.1, interest: 1402.55, total: 4286.65 },
      systematic_withdrawal_monthly: 2366.67,
    },
    pii: ["full name", "trust registration", "account number"],
    build(s) {
      s.letterhead({
        org: "Harborview Securities LLC",
        lines: [
          "One Harborview Center, Baltimore, MD 21202",
          "Member FINRA / SIPC  |  Clearing through Pinnacle Clearing Corp.",
        ],
        title: "Client Account Statement",
        subtitle: "For the period October 1, 2025 to December 31, 2025",
      });

      s.kv([
        ["Registration", "Whitfield Revocable Trust u/a/d 06/14/2009"],
        ["Account number", "HVS-xxxx-7730"],
        ["Account type", "Revocable living trust, taxable"],
        ["Registered representative", "D. Okonkwo, CRD 55512"],
      ]);

      s.heading("Portfolio value summary");
      s.table({
        columns: [
          { label: "", width: 3 },
          { label: "This Period", width: 1.4, align: "right" },
          { label: "Prior Period", width: 1.4, align: "right" },
        ],
        rows: [
          ["Beginning portfolio value", usd(398221.19), usd(385004.77)],
          ["Net contributions and withdrawals", usd(-7100.01), usd(-7100.01)],
          ["Change in market value", usd(21739.26), usd(20316.43)],
          [
            { text: "ENDING PORTFOLIO VALUE", style: "total" },
            { text: usd(412860.44), style: "total" },
            { text: usd(398221.19), style: "total" },
          ],
        ],
      });

      s.heading("Holdings detail");
      s.table({
        size: 7.6,
        headerSize: 7,
        columns: [
          { label: "Security", width: 2.8 },
          { label: "Symbol", width: 0.9 },
          { label: "Quantity", width: 1, align: "right" },
          { label: "Price", width: 1, align: "right" },
          { label: "Cost Basis", width: 1.25, align: "right" },
          { label: "Market Value", width: 1.3, align: "right" },
          { label: "% Port", width: 0.8, align: "right" },
        ],
        rows: [
          ["Vanguard Total Stock Mkt ETF", "VTI", "640.000", "$286.41", usd(141208.4), usd(183302.4), "44.4%"],
          ["Vanguard Total Intl Stock ETF", "VXUS", "820.000", "$64.18", usd(44187.2), usd(52627.6), "12.7%"],
          ["iShares Core US Aggregate Bond", "AGG", "1,120.000", "$98.44", usd(112280.0), usd(110252.8), "26.7%"],
          ["Johnson & Johnson", "JNJ", "180.000", "$162.90", usd(21744.0), usd(29322.0), "7.1%"],
          ["Procter & Gamble Co", "PG", "140.000", "$168.22", usd(18004.52), usd(23550.8), "5.7%"],
          ["US Treasury Note 4.125% 11/15/27", "-", "18,000.00", "$97.69", usd(17580.0), usd(17584.11)," 4.3%"],
          [
            { text: "CASH SWEEP - MARGIN DEBIT", style: "red" },
            { text: "-", style: "red" },
            { text: "-", style: "red" },
            { text: "-", style: "red" },
            { text: "-", style: "red" },
            { text: usd(-3775.27, { paren: true }), style: "red" },
            { text: "-0.9%", style: "red" },
          ],
          [
            { text: "TOTAL", style: "total" },
            "",
            "",
            "",
            { text: usd(331804.12), style: "total" },
            { text: usd(412860.44), style: "total" },
            { text: "100.0%", style: "total" },
          ],
        ],
      });

      s.para(
        "The cash sweep balance is negative because a margin debit of $3,775.27 was outstanding at period end. Interest accrues on the debit balance at 8.50% annually. This amount is owed to Harborview Securities and is secured by the holdings above.",
        { size: 8.5 },
      );

      s.heading("Income this period");
      s.table({
        columns: [
          { label: "Income type", width: 3 },
          { label: "This Quarter", width: 1.3, align: "right" },
          { label: "Year to Date", width: 1.3, align: "right" },
        ],
        rows: [
          ["Qualified dividends", usd(2884.1), usd(11212.88)],
          ["Taxable interest", usd(1402.55), usd(5466.19)],
          ["Realized capital gains", usd(0.0), usd(3980.44)],
          [
            { text: "Total income this quarter", style: "total" },
            { text: usd(4286.65), style: "total" },
            { text: usd(20659.51), style: "total" },
          ],
        ],
      });

      s.heading("Systematic withdrawal plan");
      s.para(
        "A systematic withdrawal of $2,366.67 is transferred to Meridian Trust Bank checking xxxx-4471 on the tenth day of each month. The plan has been in effect since March 2023 and is scheduled to continue until cancelled in writing.",
        { size: 9 },
      );

      s.paginate("Harborview Securities - Client Account Statement");
    },
  },

  /* ────────────────────────────────────────────────── 03 SSA letter ── */
  {
    file: "03_ssa_award_letter.pdf",
    title: "Social Security award letter",
    category: "Benefit income",
    blurb: "Narrative prose only, zero tables, amounts embedded in sentences",
    tests: ["amounts embedded in sentences", "gross versus net distinction", "COLA language"],
    traps: [
      "The deposited amount of $2,009.10 is net of the Medicare Part B premium. Gross benefit is $2,184.00.",
      "There is no table anywhere in this document. A table-only extractor returns nothing.",
    ],
    expected: {
      monthly_benefit_gross: 2184.0,
      medicare_part_b_premium: 174.9,
      monthly_deposit_net: 2009.1,
      cola_percent: 2.5,
    },
    pii: ["full name", "street address", "social security number", "date of birth"],
    build(s) {
      s.letterhead({
        org: "Social Security Administration",
        lines: [
          "Retirement, Survivors and Disability Insurance",
          "Mid-Atlantic Program Service Center, Philadelphia, PA 19123",
        ],
        title: "Your New Benefit Amount",
        subtitle: "Date: December 2, 2025",
      });

      s.kv([
        ["Claim number", "xxx-xx-6612 A"],
        ["Beneficiary", "Margaret E. Whitfield"],
        ["Date of birth", "April 9, 1941"],
        ["Address", "14 Ashfield Lane, Rockville, MD 20850"],
      ]);

      s.space(6);
      s.para("Dear Ms. Whitfield:", { size: 10 });
      s.para(
        "We are writing to tell you about the cost-of-living adjustment that will apply to your Social Security benefit beginning in January 2026. The law requires that benefits increase when there is a rise in the cost of living.",
      );
      s.para(
        "Your monthly benefit amount before any deductions is two thousand one hundred eighty-four dollars and no cents ($2,184.00). This reflects a cost-of-living adjustment of 2.5 percent applied to your previous monthly benefit of $2,130.73.",
      );
      s.para(
        "We will deduct $174.90 each month for your Medicare Part B medical insurance premium. After this deduction, the amount deposited to your bank account each month will be $2,009.10. The deposit is made on the third day of each month, or the preceding business day when the third falls on a weekend or federal holiday.",
      );
      s.para(
        "Your benefit is paid by direct deposit to Meridian Trust Bank, account ending 4471. If you change banks you must notify us before the change takes effect.",
      );
      s.para(
        "This letter does not establish eligibility for any other program. If you are applying for assistance with long-term care costs, the agency administering that program may ask you for this letter. Give them the gross figure of $2,184.00 as well as the net deposit amount, because different programs count the benefit differently.",
      );
      s.para(
        "If you disagree with this decision you have the right to appeal. You must make your request in writing within 60 days from the date you receive this letter.",
      );

      s.space(10);
      s.para("Sincerely,", { size: 9.5 });
      s.para("Mid-Atlantic Program Service Center", { size: 9.5, weight: "bold" });

      s.callout(
        "Important: do not report the deposited amount as your benefit. Many assistance programs count the gross benefit of $2,184.00 before the Medicare premium is deducted.",
      );

      s.paginate("Social Security Administration - Notice of Benefit Amount");
    },
  },

  /* ─────────────────────────────────────────── 04 pension / annuity ── */
  {
    file: "04_pension_annuity_crestline.pdf",
    title: "Pension and annuity election statement",
    category: "Benefit income",
    blurb: "Benefit election with a conditional survivor continuation and a COLA rider",
    tests: [
      "survivor benefit is conditional, not current income",
      "annual figure must be converted and the conversion flagged",
      "net versus gross after a health deduction",
    ],
    traps: [
      "The 50% survivor continuation of $821.25 is payable only on the death of the primary annuitant. It is not current income.",
      "The annual figure of $19,710.00 and the monthly figure of $1,642.50 describe the same benefit. Counting both doubles it.",
      "The deposited figure is net of a $118.00 retiree health deduction.",
    ],
    expected: {
      monthly_gross: 1642.5,
      annual_gross: 19710.0,
      health_deduction_monthly: 118.0,
      monthly_net: 1524.5,
      survivor_percentage: 50,
      survivor_monthly_conditional: 821.25,
      cola: true,
    },
    pii: ["full name", "date of birth", "account number"],
    build(s) {
      s.letterhead({
        org: "Crestline Mutual Retirement Services",
        lines: ["Benefits Administration, 440 Keystone Drive, Harrisburg, PA 17101", "Plan: Crestline Salaried Employees Pension Plan"],
        title: "Annual Benefit Statement and Payment Election",
        subtitle: "Plan year 2026  |  Statement date January 15, 2026",
      });

      s.kv([
        ["Participant", "Margaret E. Whitfield"],
        ["Participant ID", "CM-xxxx-2218"],
        ["Date of birth", "April 9, 1941"],
        ["Benefit commencement", "May 1, 2006"],
        ["Form of payment elected", "Joint and 50% survivor annuity"],
      ]);

      s.heading("Benefit detail");
      s.table({
        columns: [
          { label: "Component", width: 3 },
          { label: "Monthly", width: 1.3, align: "right" },
          { label: "Annual", width: 1.3, align: "right" },
        ],
        rows: [
          ["Base pension benefit", usd(1587.92), usd(19055.04)],
          ["Cost-of-living adjustment applied 01/2026 (3.5%)", usd(54.58), usd(654.96)],
          [
            { text: "Gross benefit payable", style: "total" },
            { text: usd(1642.5), style: "total" },
            { text: usd(19710.0), style: "total" },
          ],
          ["Less: retiree health plan deduction", usd(-118.0), usd(-1416.0)],
          [
            { text: "Net amount deposited", style: "bold" },
            { text: usd(1524.5), style: "bold" },
            { text: usd(18294.0), style: "bold" },
          ],
        ],
      });

      s.para(
        "The gross benefit of $1,642.50 per month and the annual figure of $19,710.00 describe the same entitlement. The annual figure is shown for tax planning only.",
        { size: 8.5, color: SOFT },
      );

      s.heading("Survivor continuation");
      s.para(
        "You elected a joint and 50 percent survivor annuity. Upon your death, and only upon your death, your surviving spouse would become entitled to a continuation benefit of $821.25 per month for the remainder of their lifetime. No survivor payment is made while you are living.",
      );
      s.callout(
        "The survivor continuation is contingent. It must not be counted as household income while the primary annuitant is living.",
      );

      s.heading("Cost of living");
      s.para(
        "This benefit carries a cost-of-living adjustment tied to the Consumer Price Index for Urban Wage Earners, applied each January, capped at 3.5 percent per year. The adjustment applied for 2026 was 3.5 percent.",
      );

      s.heading("Payment instructions");
      s.kv([
        ["Payment method", "Direct deposit"],
        ["Receiving institution", "Meridian Trust Bank"],
        ["Account", "xxxx-4471"],
        ["Payment date", "Fifth day of each month"],
      ]);

      s.paginate("Crestline Mutual - Annual Benefit Statement");
    },
  },

  /* ───────────────────────────────────────────────────── 05 1099-R ── */
  {
    file: "05_form_1099r.pdf",
    title: "Form 1099-R",
    category: "Tax documents",
    blurb: "IRS box-numbered grid, gross distribution against taxable amount",
    tests: [
      "box-numbered layout rather than labelled rows",
      "gross distribution is not the same as taxable amount",
      "an annual distribution must not be read as monthly",
    ],
    traps: [
      "Box 1 gross distribution of $28,400.04 is annual. The monthly equivalent is $2,366.67.",
      "Box 2a taxable amount of $26,118.04 is lower than box 1. Neither is a monthly income figure.",
      "Box 4 federal withholding of $2,840.00 is not an expense of the resident.",
    ],
    expected: {
      box1_gross_distribution: 28400.04,
      box2a_taxable_amount: 26118.04,
      box4_federal_withheld: 2840.0,
      box7_distribution_code: "7",
      monthly_equivalent: 2366.67,
    },
    pii: ["full name", "street address", "social security number", "account number"],
    build(s) {
      s.letterhead({
        org: "Form 1099-R",
        lines: ["Distributions From Pensions, Annuities, Retirement or Profit-Sharing Plans, IRAs, Insurance Contracts, etc."],
        title: "2025 Tax Year  |  Copy B - Report this income on your federal tax return",
        subtitle: "OMB No. 1545-0119  |  Corrected: No",
      });

      s.heading("Payer and recipient");
      s.table({
        columns: [
          { label: "PAYER name, address and TIN", width: 1 },
          { label: "RECIPIENT name, address and TIN", width: 1 },
        ],
        rowHeight: 13,
        rows: [
          ["Harborview Securities LLC", "Margaret E. Whitfield"],
          ["One Harborview Center", "14 Ashfield Lane"],
          ["Baltimore, MD 21202", "Rockville, MD 20850"],
          ["Payer TIN: 52-xxxxx19", "Recipient TIN: xxx-xx-6612"],
          ["", "Account number: HVS-xxxx-7730-IRA"],
        ],
      });

      s.heading("Distribution detail");
      s.table({
        columns: [
          { label: "Box", width: 0.5, align: "center" },
          { label: "Description", width: 3.2 },
          { label: "Amount", width: 1.3, align: "right" },
        ],
        rows: [
          ["1", "Gross distribution", { text: usd(28400.04), style: "bold" }],
          ["2a", "Taxable amount", { text: usd(26118.04), style: "bold" }],
          ["2b", "Taxable amount not determined / Total distribution", "No / No"],
          ["3", "Capital gain (included in box 2a)", usd(0.0)],
          ["4", "Federal income tax withheld", usd(2840.0)],
          ["5", "Employee contributions / designated Roth / insurance premiums", usd(2282.0)],
          ["6", "Net unrealized appreciation in employer securities", usd(0.0)],
          ["7", "Distribution code(s)", "7 - Normal distribution"],
          ["8", "Other", usd(0.0)],
          ["9a", "Your percentage of total distribution", "100%"],
          ["9b", "Total employee contributions", usd(18420.0)],
          ["12", "FATCA filing requirement", "No"],
          ["14", "State tax withheld", usd(852.0)],
          ["15", "State / Payer's state no.", "MD / 52-xxxxx19"],
          ["16", "State distribution", usd(28400.04)],
        ],
      });

      s.para(
        "The distribution reported in box 1 was paid in twelve equal monthly instalments of $2,366.67 under a systematic withdrawal plan. The plan remains in effect for the 2026 tax year.",
        { size: 8.5 },
      );

      s.callout(
        "Box 1 is an annual figure covering the full 2025 tax year. It is not a monthly income amount and must not be entered as one.",
      );

      s.paginate("Form 1099-R - 2025 Tax Year");
    },
  },

  /* ──────────────────────────────────────────────── 06 LTC policy ── */
  {
    file: "06_ltc_policy_summary.pdf",
    title: "Long-term care policy summary",
    category: "Insurance coverage",
    blurb: "Benefit schedule with a lifetime pool, elimination period and inflation rider",
    tests: [
      "a benefit pool is coverage, not an asset",
      "daily benefit must be converted to a monthly equivalent correctly",
      "the premium is an expense while the pool is not an asset",
    ],
    traps: [
      "The $328,500 lifetime maximum is coverage. Adding it to assets overstates the estate by a third of a million dollars.",
      "The daily benefit of $210.00 is not $210 per month.",
      "The 90-day elimination period means no benefit is payable for the first three months of a claim.",
    ],
    expected: {
      daily_benefit: 210.0,
      monthly_equivalent: 6391.0,
      lifetime_pool: 328500.0,
      pool_remaining: 301200.0,
      elimination_period_days: 90,
      inflation_protection: "3% compound",
      premium_monthly: 336.67,
      premium_annual: 4040.04,
      in_force: true,
    },
    pii: ["full name", "date of birth", "account number"],
    build(s) {
      s.letterhead({
        org: "Crestline Mutual Insurance Company",
        lines: ["Long-Term Care Division, 440 Keystone Drive, Harrisburg, PA 17101", "Policy administration 800-555-0188"],
        title: "Long-Term Care Policy Benefit Summary",
        subtitle: "Annual statement as of January 1, 2026",
      });

      s.kv([
        ["Insured", "Margaret E. Whitfield"],
        ["Policy number", "LTC-xxxx-4903"],
        ["Date of birth", "April 9, 1941"],
        ["Policy issued", "September 1, 2004"],
        ["Policy status", "In force - premiums current", "bold"],
      ]);

      s.heading("Benefit schedule");
      s.table({
        columns: [
          { label: "Benefit provision", width: 2.6 },
          { label: "Amount", width: 1.3, align: "right" },
          { label: "Notes", width: 2 },
        ],
        rows: [
          ["Daily maximum benefit", { text: usd(210.0), style: "bold" }, "Per day of covered care"],
          ["Monthly maximum benefit", usd(6391.0), "Calculated at 30.44 days"],
          ["Lifetime maximum benefit (benefit pool)", { text: usd(328500.0), style: "bold" }, "Coverage, not cash"],
          ["Benefit pool remaining", usd(301200.0), "As of 01/01/2026"],
          ["Benefits paid to date", usd(27300.0), "Prior claim closed 08/2024"],
          ["Elimination period", "90 calendar days", "No benefit payable during"],
          ["Inflation protection", "3% compound", "Applied each policy anniversary"],
          ["Benefit period", "4 years 4 months equivalent", "At the current daily maximum"],
        ],
      });

      s.callout(
        "The benefit pool is the maximum the policy will ever pay for covered care. It is not an account balance, it cannot be withdrawn, surrendered or assigned, and it has no cash value. It must not be recorded as an asset.",
      );

      s.heading("Premium");
      s.table({
        columns: [
          { label: "Premium detail", width: 3 },
          { label: "Amount", width: 1.3, align: "right" },
        ],
        rows: [
          ["Premium per month", usd(336.67)],
          ["Annual premium", usd(4040.04)],
          ["Premium mode", "Monthly ACH from Meridian Trust xxxx-4471"],
          ["Next premium due", "February 18, 2026"],
          ["Waiver of premium", "Applies while benefits are being paid"],
        ],
      });

      s.heading("Covered services");
      s.para(
        "Nursing facility care, assisted living facility care, memory care, home health care, adult day care and hospice are covered services under this policy. Benefits are payable on a reimbursement basis up to the daily maximum against submitted invoices for covered care, after the elimination period has been satisfied.",
      );
      s.para(
        "Benefit eligibility requires certification by a licensed health care practitioner that the insured is unable to perform at least two activities of daily living without substantial assistance for a period expected to last at least 90 days, or requires substantial supervision due to severe cognitive impairment.",
      );

      s.paginate("Crestline Mutual - Long-Term Care Policy Benefit Summary");
    },
  },

  /* ──────────────────────────────────────── 07 family worksheet ── */
  {
    file: "07_family_asset_debt_worksheet.pdf",
    title: "Family-prepared asset and debt worksheet",
    category: "Family disclosure",
    blurb: "Informal worksheet with unknown placeholders and arithmetic that does not reconcile",
    tests: [
      "unknown values must stay unknown rather than becoming zero",
      "a stated total that disagrees with its line items must raise a conflict",
      "approximate figures must be flagged as approximate",
    ],
    traps: [
      "Two lines carry ??? and must be recorded as unknown, never as $0.",
      "The stated total of $240,000 does not equal the sum of the listed lines. Both figures must be surfaced.",
      "Several figures are prefixed 'about' and are approximations.",
      "This document was prepared by a family member and carries no institutional verification.",
    ],
    expected: {
      stated_total_assets: 240000.0,
      listed_lines_sum_known: 218500.0,
      unknown_lines: 2,
      liabilities_listed: { credit_card: 8400.0, dental: null },
    },
    pii: ["full name"],
    build(s) {
      s.letterhead({
        org: "Family Financial Worksheet",
        lines: ["Prepared for the admissions file - not an official statement"],
        title: "Assets and Debts - Margaret Whitfield",
        subtitle: "Prepared by Catherine Whitfield-Brennan (daughter), February 2026",
      });

      s.para(
        "Prepared by me to the best of my knowledge from the papers I could find at Mom's house. Some of this I am not sure about and have marked with question marks. Please tell me what else you need.",
        { size: 9.5, weight: "italic", color: SOFT },
      );

      s.heading("What she has");
      s.table({
        columns: [
          { label: "Item", width: 3 },
          { label: "Where", width: 2 },
          { label: "Value", width: 1.2, align: "right" },
        ],
        rows: [
          ["Checking account", "Meridian Trust", "about $14,000"],
          ["Savings account", "Meridian Trust", "about $64,000"],
          ["CD", "Meridian Trust", usd(75000, { cents: false })],
          ["Investment account", "Harborview", "about $55,000"],
          ["Old savings bonds", "In the safe deposit box", "???"],
          ["Jewelry and furniture", "At the house", "???"],
          ["Car - 2016 Honda CR-V", "In the garage", "about $10,500"],
          [
            { text: "TOTAL (my estimate)", style: "total" },
            { text: "", style: "total" },
            { text: "about $240,000", style: "total" },
          ],
        ],
      });

      s.heading("What she owes");
      s.table({
        columns: [
          { label: "Item", width: 3 },
          { label: "Who", width: 2 },
          { label: "Amount owed", width: 1.2, align: "right" },
        ],
        rows: [
          ["Credit card balance", "Summit Card Services", usd(8400.0)],
          ["Dental work", "Brightleaf Dental", "???"],
          ["Money borrowed from me in 2024", "Catherine (daughter)", "about $3,000"],
        ],
      });

      s.heading("Other things you asked about");
      s.para(
        "She gave my brother and me some money in December 2025 to help with a house. I think it was forty-five thousand dollars but the bank statement will say exactly.",
      );
      s.para(
        "She has long-term care insurance through Crestline. I do not know what it pays. The policy is in the blue folder.",
      );
      s.para("The house is in her name. I have no idea what it is worth now. The county says something different from what the realtor said.");

      s.callout(
        "This worksheet is a family member's recollection, not a verified financial statement. Every figure requires a supporting institutional document before it is relied upon.",
      );

      s.paginate("Family Financial Worksheet - unverified");
    },
  },

  /* ──────────────────────────────────── 08 settlement statement ── */
  {
    file: "08_property_settlement_statement.pdf",
    title: "Property settlement statement",
    category: "Real estate",
    blurb: "ALTA-style closing statement with a superseded net-to-seller figure",
    tests: [
      "a future-dated lump sum is not a current balance",
      "a superseded figure must be replaced and the original raised as a warning",
      "the mortgage payoff is a liability extinguished at closing",
    ],
    traps: [
      "An earlier net-to-seller figure of $275,000.00 appears on page 1 and is superseded by $268,412.55.",
      "Settlement is dated 30 April 2026, in the future. The proceeds are not a current asset.",
      "The gross sale price of $412,000 is not the amount the seller receives.",
    ],
    expected: {
      sale_price: 412000.0,
      mortgage_payoff: 128400.18,
      net_to_seller_superseded: 275000.0,
      net_to_seller_final: 268412.55,
      settlement_date: "2026-04-30",
    },
    pii: ["full name", "street address"],
    build(s) {
      s.letterhead({
        org: "Keystone Title and Settlement Services",
        lines: ["880 Monument Avenue, Rockville, MD 20850", "Settlement agent licence MD-TA-xxxx441"],
        title: "Seller's Settlement Statement (ALTA)",
        subtitle: "Estimated - subject to final figures at closing",
      });

      s.kv([
        ["Property", "14 Ashfield Lane, Rockville, MD 20850"],
        ["Seller", "Margaret E. Whitfield"],
        ["Buyer", "T. and R. Alvarado"],
        ["File number", "KT-2026-01188"],
        ["Scheduled settlement date", "April 30, 2026", "bold"],
      ]);

      s.callout(
        "REVISED - This statement supersedes the estimate issued on 12 February 2026, which stated estimated net proceeds to seller of $275,000.00. That figure is void. The corrected figure appears below.",
      );

      s.heading("Financial detail");
      s.table({
        columns: [
          { label: "Description", width: 3.4 },
          { label: "Debit (Seller)", width: 1.3, align: "right" },
          { label: "Credit (Seller)", width: 1.3, align: "right" },
        ],
        rows: [
          ["Contract sales price", "", { text: usd(412000.0), style: "bold" }],
          ["Payoff - Pinnacle Home Lending first mortgage", usd(128400.18), ""],
          ["Payoff - accrued interest to settlement date", usd(412.6), ""],
          ["Real estate commission (5.0%)", usd(20600.0), ""],
          ["County transfer tax", usd(2060.0), ""],
          ["State recordation tax", usd(1854.0), ""],
          ["Settlement / closing fee", usd(895.0), ""],
          ["Title insurance - owner's policy", usd(1648.0), ""],
          ["Property tax proration (01/01 to 04/30)", usd(1842.33), ""],
          ["HOA dues proration", usd(216.0), ""],
          ["Repairs credited to buyer per inspection addendum", usd(4200.0), ""],
          ["Document preparation and courier", usd(459.34), ""],
          [
            { text: "Subtotals", style: "total" },
            { text: usd(162587.45), style: "total" },
            { text: usd(412000.0), style: "total" },
          ],
          [
            { text: "ESTIMATED NET PROCEEDS DUE TO SELLER", style: "total" },
            { text: "", style: "total" },
            { text: usd(268412.55), style: "total" },
          ],
        ],
      });

      s.para(
        "Net proceeds will be disbursed by wire transfer to the seller within one business day of recording. Figures are estimated and subject to final adjustment at settlement. Per diem interest on the mortgage payoff accrues at $14.95 per day after April 30, 2026.",
        { size: 8.5 },
      );

      s.callout(
        "These proceeds are expected on or after 30 April 2026. They are not a current balance and must not be recorded as an existing account.",
      );

      s.paginate("Keystone Title - Seller's Settlement Statement - REVISED");
    },
  },

  /* ──────────────────────────────────────── 09 couple summary ── */
  {
    file: "09_consolidated_couple_vance.pdf",
    title: "Consolidated household summary (couple)",
    category: "Household summary",
    blurb: "Two residents, per-owner attribution across joint and individual accounts",
    tests: [
      "ownership attribution across joint and individual accounts",
      "a joint account must not be double-counted against both residents",
      "household totals against per-resident totals",
    ],
    traps: [
      "The joint checking balance appears once under Joint. Attributing it to both residents doubles it.",
      "Only one spouse receives the pension. The other receives Social Security only.",
      "The household total is a sum. It is not an additional account.",
    ],
    expected: {
      joint_assets: 96400.22,
      resident_1_assets: 184200.0,
      resident_2_assets: 71850.4,
      household_total: 352450.62,
      household_liabilities: 41200.0,
    },
    pii: ["full name", "street address", "account number"],
    build(s) {
      s.letterhead({
        org: "Cedar Grove Senior Living",
        lines: ["Admissions and Financial Services", "2200 Cedar Grove Way, Columbia, MD 21044"],
        title: "Consolidated Household Financial Summary",
        subtitle: "Prepared February 10, 2026 from documents supplied by the applicants",
      });

      s.kv([
        ["Resident 1", "Arthur T. Vance"],
        ["Resident 2", "Dolores M. Vance"],
        ["Relationship", "Married, applying jointly"],
        ["Current address", "907 Larkspur Court, Columbia, MD 21044"],
      ]);

      s.heading("Assets by owner");
      s.table({
        columns: [
          { label: "Account", width: 2.6 },
          { label: "Institution", width: 1.7 },
          { label: "Owner", width: 1.1 },
          { label: "Balance", width: 1.3, align: "right" },
        ],
        rows: [
          ["Joint checking xxxx-2201", "Meridian Trust", "Joint", usd(18400.22)],
          ["Joint money market xxxx-9980", "Meridian Trust", "Joint", usd(78000.0)],
          ["Traditional IRA xxxx-6614", "Northstar Retirement", "Resident 1", usd(142200.0)],
          ["Certificate of deposit xxxx-1180", "Meridian Trust", "Resident 1", usd(42000.0)],
          ["Roth IRA xxxx-7742", "Harborview Securities", "Resident 2", usd(58350.4)],
          ["Savings xxxx-3318", "Meridian Trust", "Resident 2", usd(13500.0)],
          [
            { text: "HOUSEHOLD TOTAL ASSETS", style: "total" },
            { text: "", style: "total" },
            { text: "", style: "total" },
            { text: usd(352450.62), style: "total" },
          ],
        ],
      });

      s.heading("Liabilities by owner");
      s.table({
        columns: [
          { label: "Obligation", width: 2.6 },
          { label: "Creditor", width: 1.7 },
          { label: "Owner", width: 1.1 },
          { label: "Outstanding", width: 1.3, align: "right" },
        ],
        rows: [
          ["Auto loan - 2021 Subaru Outback", "Meridian Trust", "Joint", usd(14200.0)],
          ["Credit card", "Summit Card Services", "Resident 1", usd(6400.0)],
          ["Home equity line of credit", "Pinnacle Home Lending", "Joint", usd(20600.0)],
          [
            { text: "HOUSEHOLD TOTAL LIABILITIES", style: "total" },
            { text: "", style: "total" },
            { text: "", style: "total" },
            { text: usd(41200.0), style: "total" },
          ],
        ],
      });

      s.heading("Monthly income by owner");
      s.table({
        columns: [
          { label: "Source", width: 2.8 },
          { label: "Owner", width: 1.4 },
          { label: "Monthly", width: 1.3, align: "right" },
        ],
        rows: [
          ["Social Security retirement", "Resident 1", usd(2412.0)],
          ["Social Security spousal", "Resident 2", usd(1206.0)],
          ["Teachers' pension", "Resident 1", usd(1880.4)],
          ["Required minimum distribution", "Resident 1", usd(892.5)],
          [
            { text: "HOUSEHOLD MONTHLY INCOME", style: "total" },
            { text: "", style: "total" },
            { text: usd(6390.9), style: "total" },
          ],
        ],
      });

      s.heading("Monthly obligations");
      s.table({
        columns: [
          { label: "Category", width: 3.4 },
          { label: "Monthly", width: 1.3, align: "right" },
        ],
        rows: [
          ["Auto loan payment", usd(386.0)],
          ["Home equity line payment", usd(248.0)],
          ["Credit card minimum", usd(192.0)],
          ["Medicare supplement premiums (both)", usd(512.0)],
          ["Pharmacy", usd(284.6)],
        ],
      });

      s.para(
        "Each account is attributed to exactly one owner designation. A joint account is recorded once under Joint and is not also attributed to each resident individually.",
        { size: 8.5, color: SOFT },
      );

      s.paginate("Cedar Grove Senior Living - Consolidated Household Summary");
    },
  },
];
