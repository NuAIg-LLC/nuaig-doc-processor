/**
 * Fixtures 10 to 17: retirement plans, property valuation, secured and
 * unsecured debt, life insurance and community billing.
 *
 * These carry the liability and valuation side of the picture, which the first
 * nine documents only touch in passing.
 */

import { SOFT, usd } from "./layout.mjs";

export const EXTENDED = [
  /* ────────────────────────────────────────────────── 10 401(k) ── */
  {
    file: "10_401k_statement_northstar.pdf",
    title: "401(k) participant statement",
    category: "Retirement accounts",
    blurb: "Participant statement with vesting, employer match and an outstanding plan loan",
    tests: [
      "vested balance against total balance",
      "an outstanding participant loan is a liability inside a retirement asset",
      "year-to-date contribution columns are not balances",
    ],
    traps: [
      "The outstanding participant loan of $12,480.00 is a debt against the plan, not part of the balance available.",
      "Total balance $284,610.33 and vested balance $276,118.21 differ. Only the vested amount is accessible.",
      "YTD contributions of $7,200 is a flow, not a balance.",
    ],
    expected: {
      total_balance: 284610.33,
      vested_balance: 276118.21,
      unvested: 8492.12,
      outstanding_loan: 12480.0,
      loan_monthly_payment: 268.44,
      ytd_contributions: 7200.0,
    },
    pii: ["full name", "social security number", "account number", "date of birth"],
    build(s) {
      s.letterhead({
        org: "Northstar Retirement Services",
        lines: ["Recordkeeping and Plan Administration", "3100 Innovation Parkway, Columbus, OH 43215"],
        title: "401(k) Participant Statement",
        subtitle: "Plan: Lakeshore Regional Health 401(k) Plan  |  Quarter ending December 31, 2025",
      });

      s.kv([
        ["Participant", "Harold J. Whitfield"],
        ["Participant ID", "NS-xxxx-5540"],
        ["Social Security number", "xxx-xx-4417"],
        ["Date of birth", "November 2, 1946"],
        ["Plan entry date", "July 1, 1988"],
        ["Vesting schedule", "6-year graded, 92% vested"],
      ]);

      s.heading("Account balance summary");
      s.table({
        columns: [
          { label: "Source of funds", width: 2.6 },
          { label: "Beginning Balance", width: 1.3, align: "right" },
          { label: "YTD Contributions", width: 1.3, align: "right" },
          { label: "Ending Balance", width: 1.3, align: "right" },
        ],
        rows: [
          ["Employee pre-tax deferrals", usd(148220.04), usd(4800.0), usd(161840.19)],
          ["Employee Roth deferrals", usd(28110.9), usd(1200.0), usd(31022.44)],
          ["Employer matching contributions", usd(71004.55), usd(1200.0), usd(77410.08)],
          ["Employer profit sharing", usd(13066.21), usd(0.0), usd(14337.62)],
          [
            { text: "TOTAL ACCOUNT BALANCE", style: "total" },
            { text: usd(260401.7), style: "total" },
            { text: usd(7200.0), style: "total" },
            { text: usd(284610.33), style: "total" },
          ],
          [
            { text: "Vested account balance", style: "bold" },
            { text: "", style: "bold" },
            { text: "", style: "bold" },
            { text: usd(276118.21), style: "bold" },
          ],
          ["Unvested (forfeitable) portion", "", "", usd(8492.12)],
        ],
      });

      s.para(
        "The unvested portion of $8,492.12 is forfeited if employment terminates before the vesting schedule is satisfied. It should not be treated as an available asset.",
        { size: 8.5, color: SOFT },
      );

      s.heading("Outstanding participant loan");
      s.table({
        columns: [
          { label: "Loan detail", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          ["Original loan amount (issued 03/2023)", usd(22000.0)],
          [{ text: "Outstanding principal balance", style: "bold" }, { text: usd(12480.0), style: "bold" }],
          ["Interest rate", "7.25%"],
          ["Monthly repayment (payroll deduction)", usd(268.44)],
          ["Remaining term", "49 months"],
          ["Secured by", "Vested plan balance"],
        ],
      });

      s.callout(
        "The outstanding loan balance is a debt owed to the plan. It is secured against the vested balance and reduces what is actually available. If the loan is not repaid it is treated as a taxable distribution.",
      );

      s.heading("Investment allocation");
      s.table({
        size: 8,
        columns: [
          { label: "Fund", width: 3 },
          { label: "Units", width: 1, align: "right" },
          { label: "Unit Price", width: 1, align: "right" },
          { label: "Market Value", width: 1.3, align: "right" },
          { label: "%", width: 0.7, align: "right" },
        ],
        rows: [
          ["Northstar Target Retirement 2015", "4,180.221", "$31.44", usd(131426.15), "46.2%"],
          ["Vanguard Institutional Index Trust", "288.410", "$312.88", usd(90241.93), "31.7%"],
          ["PIMCO Total Return Instl", "3,920.550", "$9.88", usd(38735.03), "13.6%"],
          ["Northstar Stable Value Fund", "2,420.110", "$9.99", usd(24176.9), "8.5%"],
        ],
      });

      s.heading("Required minimum distribution");
      s.para(
        "The participant reached age 73 in 2026. A required minimum distribution of $11,232.08 must be taken for the 2026 distribution year by December 31, 2026. No distribution has been taken as of this statement date.",
      );

      s.paginate("Northstar Retirement Services - 401(k) Participant Statement");
    },
  },

  /* ───────────────────────────────────────────── 11 IRA and RMD ── */
  {
    file: "11_ira_rmd_notice.pdf",
    title: "Traditional IRA statement and RMD notice",
    category: "Retirement accounts",
    blurb: "IRA balance with a required minimum distribution schedule and withholding election",
    tests: [
      "the IRA balance is an asset while the RMD is an income stream",
      "an annual RMD must be converted to monthly and flagged",
      "the prior year-end balance is the RMD basis, not the current balance",
    ],
    traps: [
      "The account balance and the RMD are two different things. Counting the RMD as an additional asset double-counts it.",
      "The RMD of $9,884.40 is annual. The monthly equivalent is $823.70.",
      "The 12/31/2025 balance of $258,400.19 is the RMD basis, not today's balance of $261,772.08.",
    ],
    expected: {
      current_balance: 261772.08,
      prior_year_end_balance: 258400.19,
      rmd_annual: 9884.4,
      rmd_monthly_equivalent: 823.7,
      life_expectancy_factor: 26.5,
      withholding_percent: 10,
    },
    pii: ["full name", "social security number", "account number", "date of birth"],
    build(s) {
      s.letterhead({
        org: "Northstar Retirement Services",
        lines: ["Individual Retirement Account Services", "3100 Innovation Parkway, Columbus, OH 43215"],
        title: "Traditional IRA Statement and Required Minimum Distribution Notice",
        subtitle: "Statement period: January 1, 2026 to January 31, 2026",
      });

      s.kv([
        ["Account owner", "Margaret E. Whitfield"],
        ["Account number", "NS-IRA-xxxx-6614"],
        ["Social Security number", "xxx-xx-6612"],
        ["Date of birth", "April 9, 1941"],
        ["Age as of December 31, 2026", "85"],
        ["Beneficiary on file", "Yes - primary and contingent designated"],
      ]);

      s.heading("Account value");
      s.table({
        columns: [
          { label: "Description", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          ["Balance as of December 31, 2025 (RMD basis)", usd(258400.19)],
          ["Contributions this period", usd(0.0)],
          ["Distributions this period", usd(0.0)],
          ["Change in market value", usd(3371.89)],
          [{ text: "CURRENT ACCOUNT BALANCE", style: "total" }, { text: usd(261772.08), style: "total" }],
        ],
      });

      s.heading("Required minimum distribution for 2026");
      s.table({
        columns: [
          { label: "Calculation", width: 3 },
          { label: "Value", width: 1.4, align: "right" },
        ],
        rows: [
          ["Prior year-end account balance", usd(258400.19)],
          ["Uniform Lifetime Table distribution period", "26.5"],
          [{ text: "Required minimum distribution (annual)", style: "bold" }, { text: usd(9884.4), style: "bold" }],
          ["Amount distributed year to date", usd(0.0)],
          ["Amount still required by December 31, 2026", usd(9884.4)],
          ["Monthly equivalent if taken in twelve instalments", usd(823.7)],
          ["Federal withholding election", "10%"],
          ["State withholding election", "None"],
        ],
      });

      s.callout(
        "The required minimum distribution is a withdrawal from the account balance shown above. It is income when received. It is not a separate asset and must not be added to the account balance.",
      );

      s.heading("Holdings");
      s.table({
        size: 8,
        columns: [
          { label: "Holding", width: 3 },
          { label: "Shares", width: 1, align: "right" },
          { label: "Price", width: 1, align: "right" },
          { label: "Market Value", width: 1.3, align: "right" },
        ],
        rows: [
          ["Northstar Conservative Allocation Fund", "8,212.440", "$18.22", usd(149630.66)],
          ["Northstar Short-Term Bond Fund", "6,080.100", "$10.14", usd(61652.21)],
          ["Northstar Money Market Fund", "50,489.210", "$1.00", usd(50489.21)],
        ],
      });

      s.para(
        "A failure to take the full required minimum distribution by the deadline results in an excise tax on the shortfall. Contact a tax adviser before the end of the distribution year.",
        { size: 8.5, color: SOFT },
      );

      s.paginate("Northstar Retirement Services - IRA Statement and RMD Notice");
    },
  },

  /* ──────────────────────────────────────── 12 appraisal report ── */
  {
    file: "12_real_estate_appraisal.pdf",
    title: "Residential real estate appraisal",
    category: "Real estate",
    blurb: "Uniform residential appraisal with a comparable sales grid and a reconciled opinion of value",
    tests: [
      "the opinion of value is the asset, not the comparable sale prices",
      "the assessed value differs from the appraised value",
      "an outstanding mortgage against the property is a separate liability",
    ],
    traps: [
      "The comparable sales grid lists three other properties' prices. None of them is the subject's value.",
      "County assessed value of $338,500 is not the market value of $412,000.",
      "The prior appraisal of $369,000 from 2021 is historic and superseded.",
    ],
    expected: {
      appraised_value: 412000.0,
      county_assessed_value: 338500.0,
      prior_appraisal_2021: 369000.0,
      comparables: [398000.0, 425000.0, 406500.0],
      outstanding_mortgage: 128400.18,
      estimated_equity: 283599.82,
    },
    pii: ["street address", "full name"],
    build(s) {
      s.letterhead({
        org: "Keystone Appraisal Group, LLC",
        lines: ["Certified Residential Appraisers  |  MD Licence 33xxx-RA", "880 Monument Avenue, Rockville, MD 20850"],
        title: "Uniform Residential Appraisal Report",
        subtitle: "Effective date of appraisal: February 6, 2026",
      });

      s.heading("Subject property");
      s.kv([
        ["Property address", "14 Ashfield Lane, Rockville, MD 20850"],
        ["Legal owner of record", "Margaret E. Whitfield"],
        ["Property type", "Single family detached, 1 story, slab"],
        ["Year built", "1968 (substantially renovated 2014)"],
        ["Gross living area", "1,842 square feet"],
        ["Lot size", "0.24 acres"],
        ["Bedrooms / bathrooms", "3 / 2.0"],
        ["Occupancy", "Owner occupied"],
        ["Intended use", "Estate and care planning"],
      ]);

      s.heading("Comparable sales analysis");
      s.table({
        size: 7.8,
        headerSize: 7,
        columns: [
          { label: "Item", width: 1.6 },
          { label: "Subject", width: 1.3 },
          { label: "Comparable 1", width: 1.3 },
          { label: "Comparable 2", width: 1.3 },
          { label: "Comparable 3", width: 1.3 },
        ],
        rows: [
          ["Address", "14 Ashfield Ln", "22 Birch Hollow", "9 Ashfield Ln", "41 Wren Court"],
          ["Proximity", "Subject", "0.3 miles", "0.1 miles", "0.6 miles"],
          ["Sale price", "-", usd(398000, { cents: false }), usd(425000, { cents: false }), usd(406500, { cents: false })],
          ["Date of sale", "-", "11/2025", "01/2026", "12/2025"],
          ["Gross living area", "1,842 sf", "1,760 sf", "1,980 sf", "1,815 sf"],
          ["Bedrooms / baths", "3 / 2.0", "3 / 2.0", "4 / 2.5", "3 / 2.0"],
          ["Garage", "2 car", "2 car", "2 car", "1 car"],
          ["Condition", "C3 - Good", "C3", "C2", "C3"],
          ["Net adjustment", "-", "+$14,200", "-$18,400", "+$6,100"],
          [
            { text: "Adjusted value", style: "bold" },
            { text: "-", style: "bold" },
            { text: usd(412200, { cents: false }), style: "bold" },
            { text: usd(406600, { cents: false }), style: "bold" },
            { text: usd(412600, { cents: false }), style: "bold" },
          ],
        ],
      });

      s.callout(
        "The sale prices in the comparable columns are the prices other properties sold for. They are evidence, not the subject's value. Only the reconciled opinion of value below describes this property.",
      );

      s.heading("Reconciliation and opinion of value");
      s.table({
        columns: [
          { label: "Approach", width: 3 },
          { label: "Indicated Value", width: 1.4, align: "right" },
        ],
        rows: [
          ["Sales comparison approach", usd(412000, { cents: false })],
          ["Cost approach", usd(421500, { cents: false })],
          ["Income approach", "Not developed"],
          [
            { text: "OPINION OF MARKET VALUE (as of 02/06/2026)", style: "total" },
            { text: usd(412000.0), style: "total" },
          ],
        ],
      });

      s.heading("Other value indications on record");
      s.table({
        columns: [
          { label: "Source", width: 3 },
          { label: "Value", width: 1.4, align: "right" },
          { label: "Date", width: 1.2, align: "right" },
        ],
        rows: [
          ["Montgomery County assessed value (for tax)", usd(338500, { cents: false }), "07/2025"],
          ["Prior appraisal - refinance", usd(369000, { cents: false }), "04/2021"],
          ["Automated valuation model estimate", usd(405800, { cents: false }), "02/2026"],
        ],
      });

      s.para(
        "The county assessed value is produced for property tax purposes on a mass appraisal cycle and is not an opinion of market value. The 2021 appraisal is superseded by this report.",
        { size: 8.5, color: SOFT },
      );

      s.heading("Encumbrances disclosed");
      s.table({
        columns: [
          { label: "Encumbrance", width: 2.6 },
          { label: "Holder", width: 1.8 },
          { label: "Balance", width: 1.3, align: "right" },
        ],
        rows: [
          ["First mortgage", "Pinnacle Home Lending", usd(128400.18)],
          ["Second lien / HELOC", "None of record", "-"],
          [
            { text: "Estimated owner's equity", style: "total" },
            { text: "", style: "total" },
            { text: usd(283599.82), style: "total" },
          ],
        ],
      });

      s.paginate("Keystone Appraisal Group - Uniform Residential Appraisal Report");
    },
  },

  /* ─────────────────────────────────────── 13 mortgage statement ── */
  {
    file: "13_mortgage_statement.pdf",
    title: "Mortgage account statement",
    category: "Secured debt",
    blurb: "Monthly servicing statement with principal, escrow and a payoff quote",
    tests: [
      "principal balance is the liability, not the monthly payment",
      "escrow balance is an asset held by the servicer, not a reduction of the debt",
      "the payoff quote exceeds the principal balance",
    ],
    traps: [
      "The escrow balance of $2,418.60 is money held on the borrower's behalf. It does not reduce the principal.",
      "The payoff amount of $128,812.78 is higher than the principal balance of $128,400.18 because of accrued interest.",
      "The monthly payment of $1,412.60 includes escrow. Only $972.14 of it services the loan.",
    ],
    expected: {
      principal_balance: 128400.18,
      escrow_balance: 2418.6,
      payoff_quote: 128812.78,
      monthly_payment_total: 1412.6,
      principal_and_interest: 972.14,
      interest_rate: 4.25,
      maturity_date: "2034-09-01",
    },
    pii: ["full name", "street address", "account number"],
    build(s) {
      s.letterhead({
        org: "Pinnacle Home Lending",
        lines: ["Loan Servicing Division, PO Box 7741, Wilmington, DE 19801", "NMLS ID 1xxxx88  |  Servicing 800-555-0170"],
        title: "Mortgage Account Statement",
        subtitle: "Statement date February 1, 2026  |  Payment due March 1, 2026",
      });

      s.kv([
        ["Borrower", "Margaret E. Whitfield"],
        ["Property", "14 Ashfield Lane, Rockville, MD 20850"],
        ["Loan number", "xxxx-xxxx-3390"],
        ["Loan type", "Conventional fixed rate, 30 year"],
        ["Interest rate", "4.250%"],
        ["Original loan amount", usd(242000.0)],
        ["First payment date", "October 1, 2004"],
        ["Maturity date", "September 1, 2034"],
      ]);

      s.heading("Amount owed");
      s.table({
        columns: [
          { label: "Description", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          [{ text: "Outstanding principal balance", style: "bold" }, { text: usd(128400.18), style: "bold" }],
          ["Interest accrued but unpaid", usd(412.6)],
          ["Late charges outstanding", usd(0.0)],
          ["Other fees outstanding", usd(0.0)],
          [{ text: "Payoff quote good through 02/28/2026", style: "total" }, { text: usd(128812.78), style: "total" }],
        ],
      });

      s.heading("Monthly payment breakdown");
      s.table({
        columns: [
          { label: "Component", width: 3 },
          { label: "This Payment", width: 1.3, align: "right" },
          { label: "Year to Date", width: 1.3, align: "right" },
        ],
        rows: [
          ["Principal", usd(517.42), usd(517.42)],
          ["Interest", usd(454.72), usd(454.72)],
          ["Escrow - property taxes", usd(368.2), usd(368.2)],
          ["Escrow - hazard insurance", usd(72.26), usd(72.26)],
          [{ text: "Total monthly payment", style: "total" }, { text: usd(1412.6), style: "total" }, { text: usd(1412.6), style: "total" }],
          [{ text: "    of which principal and interest", style: "soft" }, { text: usd(972.14), style: "soft" }, { text: usd(972.14), style: "soft" }],
        ],
      });

      s.heading("Escrow account");
      s.table({
        columns: [
          { label: "Escrow detail", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          ["Escrow balance held on your behalf", usd(2418.6)],
          ["Projected annual property tax disbursement", usd(4418.4)],
          ["Projected annual hazard insurance disbursement", usd(867.12)],
          ["Next escrow analysis", "September 2026"],
        ],
      });

      s.callout(
        "The escrow balance is money held by the servicer to pay future tax and insurance bills on the borrower's behalf. It does not reduce the principal owed and is returned at payoff if unused.",
      );

      s.heading("Payoff information");
      s.para(
        "To release the lien, the full payoff amount must be received in cleared funds. Per diem interest of $14.95 accrues each day after the quote expiry date. A payoff statement valid at settlement must be requested separately by the settlement agent.",
      );

      s.paginate("Pinnacle Home Lending - Mortgage Account Statement");
    },
  },

  /* ──────────────────────────────────── 14 reverse mortgage ── */
  {
    file: "14_reverse_mortgage_hecm.pdf",
    title: "Reverse mortgage (HECM) statement",
    category: "Secured debt",
    blurb: "Home equity conversion mortgage with a growing balance and an available credit line",
    tests: [
      "an available credit line is borrowing capacity, not an asset",
      "the loan balance increases over time rather than amortising",
      "accrued interest and MIP are part of the balance owed",
    ],
    traps: [
      "Available line of credit of $84,200.00 is money that can be borrowed. It is not cash the resident holds.",
      "The balance grows every month. Last year's figure understates today's debt.",
      "Net principal limit is not equity and is not an asset.",
    ],
    expected: {
      loan_balance: 196840.55,
      available_credit_line: 84200.0,
      principal_limit: 281040.55,
      property_value: 412000.0,
      accrued_interest_ytd: 11204.18,
      mip_accrued_ytd: 1988.4,
      interest_rate: 6.84,
    },
    pii: ["full name", "street address", "account number", "date of birth"],
    build(s) {
      s.letterhead({
        org: "Evergreen Reverse Mortgage Servicing",
        lines: ["HECM Servicing Centre, 1150 Lakeside Drive, Tampa, FL 33602", "FHA approved servicer  |  HUD case 241-xxxxx72"],
        title: "Home Equity Conversion Mortgage - Monthly Statement",
        subtitle: "Statement period January 1, 2026 to January 31, 2026",
      });

      s.kv([
        ["Borrower", "Dolores M. Vance"],
        ["Property", "907 Larkspur Court, Columbia, MD 21044"],
        ["Loan number", "EV-xxxx-8802"],
        ["Date of birth", "June 14, 1944"],
        ["Loan originated", "March 2019"],
        ["Product", "HECM adjustable rate, line of credit"],
        ["Current interest rate", "6.840%"],
      ]);

      s.heading("Loan balance");
      s.table({
        columns: [
          { label: "Description", width: 3 },
          { label: "This Period", width: 1.3, align: "right" },
          { label: "Year to Date", width: 1.3, align: "right" },
        ],
        rows: [
          ["Beginning loan balance", usd(195718.22), usd(183648.0)],
          ["Draws taken this period", usd(0.0), usd(0.0)],
          ["Interest accrued", usd(1115.59), usd(11204.18)],
          ["Mortgage insurance premium accrued", usd(6.74), usd(1988.4)],
          ["Servicing fee", usd(0.0), usd(0.0)],
          [{ text: "ENDING LOAN BALANCE (amount owed)", style: "total" }, { text: usd(196840.55), style: "total" }, { text: usd(196840.55), style: "total" }],
        ],
      });

      s.callout(
        "A reverse mortgage balance grows rather than shrinks. No monthly payment is required, so interest and insurance premiums are added to the balance each month. The full amount becomes due when the borrower dies, sells, or permanently leaves the home.",
      );

      s.heading("Principal limit and available credit");
      s.table({
        columns: [
          { label: "Description", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          ["Net principal limit", usd(281040.55)],
          ["Less: current loan balance", usd(-196840.55)],
          [{ text: "Available line of credit", style: "bold" }, { text: usd(84200.0), style: "bold" }],
          ["Line of credit growth rate", "6.840% annually"],
        ],
      });

      s.callout(
        "The available line of credit is money that may be borrowed in future. It is not cash on hand, it is not a deposit account, and it must not be recorded as an asset. Drawing on it increases the amount owed.",
      );

      s.heading("Property and obligations");
      s.table({
        columns: [
          { label: "Item", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          ["Appraised property value at origination", usd(372000, { cents: false })],
          ["Current estimated property value", usd(412000, { cents: false })],
          ["Estimated remaining equity", usd(215159.45)],
          ["Annual property tax obligation (borrower pays)", usd(4188.0)],
          ["Annual hazard insurance obligation (borrower pays)", usd(1104.0)],
        ],
      });

      s.para(
        "The borrower remains responsible for property taxes, hazard insurance and property maintenance. Failure to meet these obligations is a default under the loan agreement and may result in foreclosure.",
        { size: 8.5 },
      );

      s.paginate("Evergreen Reverse Mortgage Servicing - HECM Monthly Statement");
    },
  },

  /* ───────────────────────────── 15 credit card and medical ── */
  {
    file: "15_credit_card_medical_debt.pdf",
    title: "Credit card statement and medical account summary",
    category: "Unsecured debt",
    blurb: "Revolving card balance with minimum payment, plus itemised patient balances",
    tests: [
      "minimum payment is not the balance owed",
      "an insurance-adjusted patient responsibility is the real liability",
      "a payment plan instalment is a monthly obligation",
    ],
    traps: [
      "The minimum payment due of $192.00 is not the debt. The balance is $8,412.77.",
      "The billed charges of $18,440.00 are not owed. Patient responsibility after insurance is $3,187.42.",
      "The available credit of $6,587.23 is borrowing capacity, not an asset.",
    ],
    expected: {
      card_balance: 8412.77,
      card_minimum_payment: 192.0,
      card_apr: 24.99,
      card_available_credit: 6587.23,
      medical_billed: 18440.0,
      medical_insurance_adjustment: 15252.58,
      medical_patient_responsibility: 3187.42,
      medical_payment_plan_monthly: 125.0,
    },
    pii: ["full name", "street address", "account number", "medicare identifier"],
    build(s) {
      s.letterhead({
        org: "Summit Card Services",
        lines: ["PO Box 2290, Sioux Falls, SD 57117", "Customer service 800-555-0133"],
        title: "Credit Card Statement",
        subtitle: "Billing cycle January 6, 2026 to February 5, 2026",
      });

      s.kv([
        ["Cardholder", "Margaret E. Whitfield"],
        ["Account number", "xxxx xxxx xxxx 7741"],
        ["Payment due date", "March 2, 2026"],
      ]);

      s.heading("Account summary");
      s.table({
        columns: [
          { label: "Description", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          ["Previous balance", usd(8894.12)],
          ["Payments and credits", usd(-740.0)],
          ["Purchases", usd(92.44)],
          ["Cash advances", usd(0.0)],
          ["Fees charged", usd(0.0)],
          ["Interest charged", usd(166.21)],
          [{ text: "NEW BALANCE (amount owed)", style: "total" }, { text: usd(8412.77), style: "total" }],
          [{ text: "Minimum payment due", style: "bold" }, { text: usd(192.0), style: "bold" }],
          ["Credit limit", usd(15000.0)],
          ["Available credit", usd(6587.23)],
          ["Annual percentage rate (purchases)", "24.99%"],
        ],
      });

      s.callout(
        "Minimum payment warning: paying only the minimum of $192.00 each month would take approximately 23 years to clear this balance and would cost an estimated $11,840 in interest. The minimum payment is not the amount owed.",
      );

      s.space(10);
      s.rule({ thickness: 1.2 });
      s.letterhead({
        org: "Lakeshore Regional Health",
        lines: ["Patient Financial Services, 4400 Lakeshore Boulevard, Columbia, MD 21044", "Billing enquiries 800-555-0155"],
        title: "Patient Account Summary",
        subtitle: "Statement date February 4, 2026",
      });

      s.kv([
        ["Patient", "Margaret E. Whitfield"],
        ["Account number", "LRH-xxxx-55210"],
        ["Insurance on file", "Medicare Part A and B, plus Plan G supplement"],
      ]);

      s.heading("Account detail");
      s.table({
        size: 8,
        columns: [
          { label: "Date of service", width: 1.1 },
          { label: "Description", width: 2.4 },
          { label: "Billed", width: 1.1, align: "right" },
          { label: "Insurance Adj.", width: 1.2, align: "right" },
          { label: "Patient Resp.", width: 1.2, align: "right" },
        ],
        rows: [
          ["09/14/2025", "Inpatient admission, 3 days", usd(14200.0), usd(-12480.0), usd(1720.0)],
          ["09/14/2025", "Diagnostic imaging", usd(2180.0), usd(-1844.58), usd(335.42)],
          ["10/02/2025", "Outpatient follow-up", usd(640.0), usd(-528.0), usd(112.0)],
          ["11/18/2025", "Physical therapy, 8 sessions", usd(1420.0), usd(-400.0), usd(1020.0)],
          [
            { text: "TOTALS", style: "total" },
            { text: "", style: "total" },
            { text: usd(18440.0), style: "total" },
            { text: usd(-15252.58), style: "total" },
            { text: usd(3187.42), style: "total" },
          ],
        ],
      });

      s.heading("Payment arrangement");
      s.kv([
        ["Patient responsibility outstanding", usd(3187.42), "bold"],
        ["Agreed monthly instalment", usd(125.0)],
        ["Instalments remaining", "26"],
        ["Interest charged", "None while the plan is current"],
        ["Next instalment due", "February 28, 2026"],
      ]);

      s.para(
        "Only the patient responsibility column is owed. Billed charges are the list price before insurance contractual adjustments and do not represent a debt.",
        { size: 8.5, color: SOFT },
      );

      s.paginate("Summit Card Services and Lakeshore Regional Health - Account Statements");
    },
  },

  /* ─────────────────────────────── 16 life insurance CSV ── */
  {
    file: "16_life_insurance_cash_value.pdf",
    title: "Whole life policy annual statement",
    category: "Insurance coverage",
    blurb: "Cash surrender value against death benefit, with an outstanding policy loan",
    tests: [
      "cash surrender value is an asset while the death benefit is not",
      "an outstanding policy loan reduces both the surrender value and the death benefit",
      "the net surrender value is what is actually realisable",
    ],
    traps: [
      "The death benefit of $150,000 is not an asset of the living insured.",
      "The gross cash value of $48,220.14 is reduced by an $8,400 policy loan. Net surrender value is $39,820.14.",
      "Surrender charges apply until policy year 20.",
    ],
    expected: {
      death_benefit: 150000.0,
      gross_cash_value: 48220.14,
      policy_loan_outstanding: 8400.0,
      net_cash_surrender_value: 39820.14,
      annual_premium: 2184.0,
      in_force: true,
    },
    pii: ["full name", "date of birth", "account number"],
    build(s) {
      s.letterhead({
        org: "Beacon Life Assurance Company",
        lines: ["Policyowner Services, 600 Beacon Street, Hartford, CT 06103", "Policy services 800-555-0199"],
        title: "Whole Life Policy Annual Statement",
        subtitle: "Policy anniversary January 12, 2026",
      });

      s.kv([
        ["Insured and owner", "Harold J. Whitfield"],
        ["Policy number", "BL-xxxx-11742"],
        ["Date of birth", "November 2, 1946"],
        ["Policy issued", "January 12, 1994"],
        ["Policy year", "32"],
        ["Policy status", "In force - premiums paid to date", "bold"],
      ]);

      s.heading("Death benefit");
      s.table({
        columns: [
          { label: "Description", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          ["Base face amount", usd(150000, { cents: false })],
          ["Paid-up additions", usd(18420.5)],
          ["Less: outstanding policy loan and accrued interest", usd(-8400.0)],
          [{ text: "Net death benefit payable to beneficiary", style: "total" }, { text: usd(160020.5), style: "total" }],
        ],
      });

      s.callout(
        "The death benefit is payable to the named beneficiary on the death of the insured. While the insured is living it is not an asset, it cannot be accessed, and it must not be recorded on a balance sheet.",
      );

      s.heading("Cash value");
      s.table({
        columns: [
          { label: "Description", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          ["Guaranteed cash value", usd(41188.0)],
          ["Accumulated dividends", usd(7032.14)],
          [{ text: "Gross cash value", style: "bold" }, { text: usd(48220.14), style: "bold" }],
          ["Less: outstanding policy loan", usd(-8400.0)],
          ["Less: surrender charge (policy year 32)", usd(0.0)],
          [{ text: "NET CASH SURRENDER VALUE", style: "total" }, { text: usd(39820.14), style: "total" }],
        ],
      });

      s.para(
        "The net cash surrender value is the amount payable to the owner if the policy is surrendered today. Surrendering the policy terminates the death benefit and may create a taxable gain.",
        { size: 8.5 },
      );

      s.heading("Policy loan");
      s.table({
        columns: [
          { label: "Loan detail", width: 3 },
          { label: "Amount", width: 1.4, align: "right" },
        ],
        rows: [
          ["Loan principal outstanding", usd(8000.0)],
          ["Accrued loan interest", usd(400.0)],
          [{ text: "Total loan balance", style: "bold" }, { text: usd(8400.0), style: "bold" }],
          ["Loan interest rate", "5.000%"],
          ["Repayment", "Optional - deducted from proceeds if unpaid"],
        ],
      });

      s.heading("Premium");
      s.kv([
        ["Annual premium", usd(2184.0)],
        ["Premium mode", "Annual, paid by cheque"],
        ["Next premium due", "January 12, 2027"],
        ["Dividend option", "Paid-up additions"],
      ]);

      s.paginate("Beacon Life Assurance - Whole Life Policy Annual Statement");
    },
  },

  /* ─────────────────────────── 17 community billing ── */
  {
    file: "17_assisted_living_billing.pdf",
    title: "Assisted living community invoice",
    category: "Care costs",
    blurb: "Monthly community invoice with base rate, care level charges and ancillary items",
    tests: [
      "recurring monthly cost of care",
      "a one-off community fee is not a recurring expense",
      "a level-of-care increase changes the forward-looking monthly figure",
    ],
    traps: [
      "The one-time community fee of $4,500 is not a monthly expense.",
      "The current invoice total of $7,842.00 includes one-off items. The recurring monthly cost is $6,942.00.",
      "The care level increases to level 3 from March, raising the recurring figure to $7,342.00.",
    ],
    expected: {
      base_monthly_rate: 5400.0,
      care_level_2_charge: 1200.0,
      recurring_monthly_current: 6942.0,
      recurring_monthly_from_march: 7342.0,
      one_time_community_fee: 4500.0,
      invoice_total: 7842.0,
    },
    pii: ["full name", "street address", "account number"],
    build(s) {
      s.letterhead({
        org: "Cedar Grove Senior Living",
        lines: ["2200 Cedar Grove Way, Columbia, MD 21044", "Licensed assisted living  |  MD Licence ALF-xxx-2217"],
        title: "Monthly Statement of Account",
        subtitle: "Service period February 1, 2026 to February 28, 2026",
      });

      s.kv([
        ["Resident", "Margaret E. Whitfield"],
        ["Resident account", "CG-xxxx-0441"],
        ["Apartment", "Birch House, Suite 214"],
        ["Move-in date", "January 15, 2026"],
        ["Current level of care", "Level 2"],
        ["Responsible party", "Catherine Whitfield-Brennan (daughter)"],
      ]);

      s.heading("Recurring monthly charges");
      s.table({
        columns: [
          { label: "Charge", width: 3.4 },
          { label: "Monthly", width: 1.3, align: "right" },
        ],
        rows: [
          ["Base residency rate - one bedroom, Birch House", usd(5400.0)],
          ["Level of care supplement - Level 2", usd(1200.0)],
          ["Medication administration", usd(285.0)],
          ["Cable, internet and telephone", usd(57.0)],
          [
            { text: "TOTAL RECURRING MONTHLY COST", style: "total" },
            { text: usd(6942.0), style: "total" },
          ],
        ],
      });

      s.heading("Non-recurring charges this period");
      s.table({
        columns: [
          { label: "Charge", width: 3.4 },
          { label: "Amount", width: 1.3, align: "right" },
        ],
        rows: [
          ["Community fee (one time, non-refundable)", usd(4500.0)],
          ["Guest meals", usd(84.0)],
          ["Salon services", usd(66.0)],
          ["Transportation - medical appointments", usd(150.0)],
          [{ text: "Subtotal non-recurring", style: "bold" }, { text: usd(4800.0), style: "bold" }],
        ],
      });

      s.heading("Invoice total");
      s.table({
        columns: [
          { label: "Description", width: 3.4 },
          { label: "Amount", width: 1.3, align: "right" },
        ],
        rows: [
          ["Recurring monthly charges", usd(6942.0)],
          ["Non-recurring charges", usd(4800.0)],
          ["Less: prorated credit for partial January occupancy", usd(-3900.0)],
          [{ text: "AMOUNT DUE BY FEBRUARY 28, 2026", style: "total" }, { text: usd(7842.0), style: "total" }],
        ],
      });

      s.callout(
        "The community fee of $4,500.00 is charged once at move-in and is not a recurring monthly expense. Monthly cost planning should use the recurring figure of $6,942.00.",
      );

      s.heading("Scheduled rate change");
      s.para(
        "Following the care assessment completed on February 18, 2026, the resident's level of care will move from Level 2 to Level 3 effective March 1, 2026. The Level 3 supplement is $1,600.00 per month, which raises the total recurring monthly cost to $7,342.00 from March 2026.",
      );

      s.heading("Long-term care insurance coordination");
      s.para(
        "Cedar Grove submits invoices directly to Crestline Mutual under policy LTC-xxxx-4903 on the resident's behalf. Reimbursement is paid to the resident, not to the community. The resident remains responsible for the full invoice amount regardless of the status of any insurance claim.",
      );

      s.paginate("Cedar Grove Senior Living - Monthly Statement of Account");
    },
  },
];
