/**
 * The classification lexicon.
 *
 * Every rule is an ordered (pattern → category) pair. Order matters: the first
 * match wins, so narrow patterns are listed before broad ones. `weight` is the
 * confidence a match contributes: a precise term like "certificate of deposit"
 * is worth more than a catch-all like "account".
 */

import type { AccountType, LiabilityType, Liquidity } from "./schema";

export type AssetRule = {
  re: RegExp;
  type: AccountType;
  liquidity: Liquidity;
  weight: number;
};

export const ASSET_RULES: AssetRule[] = [
  { re: /\bcertificates?\s+of\s+deposit\b|\bCDs?\b(?!\s*player)/i, type: "certificate_of_deposit", liquidity: "partial", weight: 0.95 },
  { re: /\bmoney\s+market\b/i, type: "money_market", liquidity: "liquid", weight: 0.95 },
  { re: /\broth\b|\btraditional\s+ira\b|\brollover\s+ira\b|\bira\b|\b401\s*\(?k\)?\b|\b403\s*\(?b\)?\b|\bsep[\s-]?ira\b|\bretirement\s+(account|plan|savings)\b|\bkeogh\b/i, type: "retirement", liquidity: "partial", weight: 0.93 },
  { re: /\bcash\s+(surrender\s+)?value\b|\blife\s+insurance\b.*\bvalue\b/i, type: "life_insurance_cash_value", liquidity: "partial", weight: 0.9 },
  { re: /\bdeferred\s+annuity\b|\bfixed\s+annuity\b|\bvariable\s+annuity\b|\bannuity\s+(contract|account|value)\b/i, type: "annuity", liquidity: "partial", weight: 0.88 },
  { re: /\bresidence\b|\breal\s+(property|estate)\b|\bprimary\s+home\b|\bhomestead\b|\bcondominium\b|\bdwelling\b|\bland\b|\bproperty\s+at\b|\bhouse\b/i, type: "real_property", liquidity: "illiquid", weight: 0.9 },
  { re: /\brevocable\s+trust\b|\birrevocable\s+trust\b|\btrust\s+(account|assets?|corpus)\b/i, type: "trust", liquidity: "partial", weight: 0.85 },
  { re: /\bbrokerage\b|\btaxable\s+investment\b|\bholdings?\b|\bportfolio\s+value\b|\bsecurities\b|\bmutual\s+funds?\b|\bequit(y|ies)\b|\bmanaged\s+account\b/i, type: "brokerage", liquidity: "partial", weight: 0.85 },
  { re: /\bsavings?\b|\bpassbook\b|\bhigh[\s-]yield\b/i, type: "savings", liquidity: "liquid", weight: 0.88 },
  { re: /\bchecking\b|\bdemand\s+deposit\b|\bcurrent\s+account\b/i, type: "checking", liquidity: "liquid", weight: 0.9 },
  { re: /\bvehicle\b|\bautomobile\b|\bjewel(ry|lery)\b|\bfurnishings?\b|\bpersonal\s+(property|effects)\b|\bcollecti(on|bles)\b/i, type: "personal_property", liquidity: "illiquid", weight: 0.8 },
  { re: /\bcash\s+on\s+hand\b|\bcash\b(?!\s*(flow|surrender|value))/i, type: "checking", liquidity: "liquid", weight: 0.6 },
];

export type LiabilityRule = { re: RegExp; type: LiabilityType; weight: number };

export const LIABILITY_RULES: LiabilityRule[] = [
  { re: /\breverse\s+mortgage\b/i, type: "reverse_mortgage", weight: 0.95 },
  { re: /\bhome\s+equity\b|\bheloc\b|\bsecond\s+(mortgage|lien)\b/i, type: "home_equity_line", weight: 0.93 },
  { re: /\bmortgage\b|\bprincipal\s+balance\b|\bbalance\s+of\s+principal\b/i, type: "mortgage", weight: 0.92 },
  { re: /\b(auto|car|vehicle|motor)\s*(mobile)?\s*loan\b|\bauto\s+financ/i, type: "auto_loan", weight: 0.9 },
  { re: /\bcredit\s+card\b|\bvisa\b|\bmastercard\b|\bamerican\s+express\b|\bamex\b|\bdiscover\s+card\b|\bcard\s+balance\b|\brevolving\s+(credit|balance)\b/i, type: "credit_card", weight: 0.9 },
  { re: /\b(medical|dental|hospital|clinic|physician|surgical|pharmacy)\b[^.]{0,40}\b(bill|balance|debt|owed|due|invoice|statement\s+balance)\b/i, type: "medical_debt", weight: 0.88 },
  { re: /\b(irs|federal|state|property)\s+tax(es)?\b[^.]{0,30}\b(owed|due|outstanding|liability|arrears)\b|\btax\s+lien\b/i, type: "tax_liability", weight: 0.88 },
  { re: /\blien\b|\bjudg(e)?ment\b/i, type: "lien", weight: 0.85 },
  { re: /\bmargin\s+(loan|balance|debit)\b|\bcash\s+sweep\b|\bdebit\s+balance\b/i, type: "margin_loan", weight: 0.85 },
  { re: /\bpersonal\s+loan\b|\bsignature\s+loan\b|\bstudent\s+loan\b|\bnote\s+payable\b/i, type: "personal_loan", weight: 0.85 },
  { re: /\bloan\b|\bowed\b|\boutstanding\b|\bpayoff\b|\bpayable\b|\bamount\s+due\b|\bpast\s+due\b|\bdebt\b|\barrears\b|\bbalance\s+remaining\b|\bunpaid\b/i, type: "other", weight: 0.62 },
];

export type IncomeRule = { re: RegExp; label: string; weight: number };

export const INCOME_RULES: IncomeRule[] = [
  { re: /\bsocial\s+security\b|\bSSA\b|\bRSDI\b|\btitle\s+II\b/i, label: "Social Security", weight: 0.95 },
  { re: /\bsupplemental\s+security\s+income\b|\bSSI\b/i, label: "Supplemental Security Income", weight: 0.95 },
  { re: /\bpension\b|\bretirement\s+benefit\b|\bdefined\s+benefit\b/i, label: "Pension", weight: 0.93 },
  { re: /\b(va|veterans?)\s+(benefit|pension|compensation|aid\s+and\s+attendance)\b|\baid\s+and\s+attendance\b/i, label: "Veterans benefit", weight: 0.93 },
  { re: /\bannuity\s+(payment|income|distribution)\b|\bmonthly\s+annuity\b/i, label: "Annuity payment", weight: 0.9 },
  { re: /\b(systematic|periodic|required\s+minimum)\s+(withdrawal|distribution)\b|\bRMD\b|\bIRA\s+distribution\b/i, label: "Retirement distribution", weight: 0.9 },
  { re: /\brental\s+income\b|\blease\s+income\b/i, label: "Rental income", weight: 0.9 },
  { re: /\bdividends?\b/i, label: "Dividends", weight: 0.85 },
  { re: /\binterest\s+(income|earned|paid\s+to\s+you)\b/i, label: "Interest income", weight: 0.85 },
  { re: /\bcapital\s+gains?\b/i, label: "Capital gains", weight: 0.8 },
  { re: /\bdeposit\s+from\b|\bdirect\s+deposit\b|\bpayroll\b|\bwages\b|\bsalary\b/i, label: "Deposit", weight: 0.7 },
];

export type ExpenseRule = { re: RegExp; label: string; weight: number };

export const EXPENSE_RULES: ExpenseRule[] = [
  { re: /\b(assisted\s+living|memory\s+care|skilled\s+nursing|community|residency)\s+(fee|rate|charge|rent)\b|\bmonthly\s+service\s+fee\b|\bcare\s+fee\b|\blevel\s+of\s+care\b/i, label: "Community fee", weight: 0.93 },
  { re: /\bhome\s+(health\s+)?care\b|\bcaregiver\b|\bcompanion\s+care\b|\bpersonal\s+care\s+aide\b/i, label: "Home care", weight: 0.92 },
  { re: /\bmedicare\s+(part\s+[a-d]|supplement|advantage|premium)\b|\bmedigap\b/i, label: "Medicare premium", weight: 0.92 },
  { re: /\blong[\s-]term\s+care\s+premium\b|\bLTC\s+premium\b/i, label: "LTC premium", weight: 0.92 },
  { re: /\bpharmacy\b|\bprescription(s)?\b|\bpart\s+d\b/i, label: "Pharmacy", weight: 0.88 },
  { re: /\brent\b|\blease\s+payment\b/i, label: "Rent", weight: 0.85 },
  { re: /\bproperty\s+tax\b|\bhoa\s+(dues?|fee)\b|\bhomeowners?\s+(association|insurance)\b/i, label: "Property charges", weight: 0.85 },
  { re: /\butilit(y|ies)\b|\belectric\b|\bgas\s+bill\b|\bwater\s+bill\b/i, label: "Utilities", weight: 0.82 },
  { re: /\binsurance\s+premium\b|\bpremium\s+(due|payment)\b/i, label: "Insurance premium", weight: 0.8 },
  { re: /\btransportation\b|\bmeals?\b|\bgrocer(y|ies)\b|\bhousekeeping\b/i, label: "Living costs", weight: 0.72 },
];

/** A line that sums other lines on the same document. */
export const SUBTOTAL_RE =
  /\b(sub)?total\b|\bsum\s+of\b|\baggregate\b|\ball\s+accounts\b|\bcombined\b|\bnet\s+worth\b|\btotal\s+on\s+deposit\b|\bgrand\s+total\b/i;

/** Column headers that carry a current value rather than a historical one. */
export const VALUE_HEADER_RE =
  /\b(closing|ending|current|market|present|statement)\s*(balance|value)?\b|\bbalance\b|\bvalue\b|\bamount\b|\bowed\b|\boutstanding\b|\btotal\b/i;

/** Column headers that must never be read as a current value. */
export const DECOY_HEADER_RE =
  /\b(opening|beginning|prior|previous|cost\s+basis|basis|purchase|original|year[\s-]?to[\s-]?date|ytd|last\s+year|deposits?|withdrawals?|credits?|debits?|shares?|units?|quantity|price|rate|%|percent)\b/i;

export const CONDITIONAL_RE =
  /\bsurviv(or|ing)\b|\bupon\s+(the\s+)?death\b|\bpayable\s+(only\s+)?(upon|on|after)\b|\bcontingent\b|\bin\s+the\s+event\s+of\b|\bwould\s+(be|become)\s+payable\b/i;

export const APPROXIMATE_RE = /\babout\b|\bapprox(imately)?\b|~|\broughly\b|\bestimated?\b|\bballpark\b|\bor\s+so\b/i;

export const NET_RE = /\bnet\s+of\b|\bafter\s+(deduction|withholding)\b|\bnet\s+(amount|payment|benefit)\b/i;

export const COLA_RE = /\bcola\b|\bcost[\s-]of[\s-]living\b|\binflation\s+adjust/i;

export const GIFT_RE = /\bgift\b|\bgifted\b|\bto\s+(my\s+)?(daughter|son|grandchild|grandson|granddaughter|niece|nephew|child|children|family)\b|\bassistance\s+with\b|\bdown\s+payment\s+for\b|\bno\s+consideration\b/i;

export const OWN_ACCOUNT_RE =
  /\b(own|internal|between\s+(my|our|your)\s+own)\b|\btransfer\s+to\s+(savings|checking|money\s+market)\b|\bself\b|\bsame\s+(owner|household)\b/i;

export const RELATIONSHIP_RE =
  /\b(daughter|son|grandchild|grandson|granddaughter|spouse|wife|husband|niece|nephew|sister|brother|child|trustee|caregiver|friend|church|charity)\b/i;

export const FUTURE_PROCEED_RE =
  /\b(net\s+)?proceeds\b|\bexpected\s+(to\s+)?(close|settle|fund)\b|\bsettlement\s+(date|statement)\b|\bupon\s+(sale|closing)\b|\bestimated\s+net\s+to\s+seller\b|\bdue\s+to\s+seller\b/i;

export const SUPERSEDE_RE =
  /\bsupersede[sd]?\b|\bamended\b|\brevised\b|\breplaces?\b|\bcorrected\b|\bstruck\b|\bvoid(ed)?\b|\bpreviously\s+(stated|reported)\b/i;

export const FAMILY_PREPARED_RE =
  /\bprepared\s+by\b[^.]{0,40}\b(daughter|son|family|myself|power\s+of\s+attorney|poa)\b|\bfamily\s+(worksheet|summary|prepared)\b|\bnot\s+an\s+official\b|\bbest\s+of\s+(my|our)\s+knowledge\b|\bhand[\s-]written\b/i;

export const UNKNOWN_VALUE_RE = /^\s*(\?+|n\/?a|tbd|unknown|not\s+(stated|known|sure)|-|-|-{1,3}|\.{3})\s*$/i;

/** Document-type signatures, ordered most specific first. */
export const DOC_TYPES: { re: RegExp; label: string; weight: number }[] = [
  { re: /\bform\s+1099[\s-]?r\b/i, label: "Form 1099-R: retirement distribution", weight: 0.96 },
  { re: /\bform\s+1099[\s-]?(int|div|b)\b/i, label: "Form 1099: investment income", weight: 0.95 },
  { re: /\bsocial\s+security\b[^.]{0,30}\b(award|benefit\s+verification|cost[\s-]of[\s-]living)\b|\byour\s+new\s+benefit\s+amount\b/i, label: "Social Security award letter", weight: 0.95 },
  { re: /\blong[\s-]term\s+care\b[^.]{0,30}\b(policy|coverage|benefit\s+summary|schedule)\b/i, label: "Long-term care policy summary", weight: 0.94 },
  { re: /\b(closing|settlement)\s+(statement|disclosure)\b|\bHUD[\s-]?1\b|\balta\s+settlement\b/i, label: "Property settlement statement", weight: 0.94 },
  { re: /\b(mortgage|loan)\s+(statement|payoff|account\s+summary)\b|\bprincipal\s+balance\b/i, label: "Mortgage / loan statement", weight: 0.92 },
  { re: /\bcredit\s+card\s+statement\b|\bminimum\s+payment\s+due\b/i, label: "Credit card statement", weight: 0.92 },
  { re: /\b(pension|annuity)\b[^.]{0,30}\b(statement|election|award|benefit)\b/i, label: "Pension / annuity statement", weight: 0.92 },
  { re: /\b(brokerage|investment|portfolio)\s+(account\s+)?statement\b|\bholdings\s+summary\b/i, label: "Brokerage statement", weight: 0.92 },
  { re: /\b(bank|deposit|account)\s+statement\b|\bstatement\s+of\s+account\b/i, label: "Bank statement", weight: 0.9 },
  { re: /\b(asset|financial|net\s+worth)\s+(and\s+debt\s+)?(worksheet|summary|disclosure|inventory)\b/i, label: "Financial disclosure worksheet", weight: 0.88 },
  { re: /\b(assisted\s+living|memory\s+care|residency|community)\s+(agreement|billing|invoice|statement|fee\s+schedule)\b/i, label: "Community billing statement", weight: 0.9 },
];

/** Identity attributes to report as TYPES only. Values never leave the document. */
export const PII_SIGNATURES: { re: RegExp; type: string }[] = [
  { re: /\b\d{3}[\s-]\d{2}[\s-]\d{4}\b|\bx{3,}[\s-]?x{2}[\s-]?\d{4}\b|\*{3}[\s-]?\*{2}[\s-]?\d{4}\b|\bSSN\b|\bsocial\s+security\s+number\b/i, type: "social security number" },
  { re: /\bdate\s+of\s+birth\b|\bDOB\b|\bborn\s+on\b/i, type: "date of birth" },
  { re: /\b\d{1,6}\s+[A-Z][A-Za-z.'-]+\s+(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Boulevard|Blvd|Way|Place|Pl|Terrace|Circle|Cir)\b/, type: "street address" },
  { re: /\b[A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+\b|\bMr\.|\bMrs\.|\bMs\.|\baccount\s+holder\b|\bname\s*:/i, type: "full name" },
  { re: /\b\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\bphone\b|\btelephone\b/i, type: "phone number" },
  { re: /\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/, type: "email address" },
  { re: /\bmedicare\s+(number|claim|MBI)\b|\b[0-9A-Z]{4}-[0-9A-Z]{3}-[0-9A-Z]{4}\b/i, type: "medicare identifier" },
  { re: /\baccount\s+(number|no\.?|#)\b|\b[x*•]{3,}\s?\d{3,4}\b/i, type: "account number" },
  { re: /\btrust\s+(registration|dated|u\/?a\/?d)\b/i, type: "trust registration" },
];
