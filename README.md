# NuAIg DocIntel

**Financial document intelligence for senior living.**

A proof of concept. Drop in the financial documents a prospective resident
submits and get back structured **assets, liabilities, income, expenses,
coverage and look-back transfers**, each traceable to the exact table cell or
sentence it was read from.

Every figure it produces is a **candidate for human verification**. The system
proposes fields. It does not assign a risk tier, compute a funding gap, or
recommend an admissions outcome.

---

## What goes in

Azure AI Document Intelligence reads all of these directly, with no conversion
step in the application:

| Format | Extensions |
|---|---|
| PDF | `.pdf` |
| Word | `.docx` |
| Excel | `.xlsx` |
| PowerPoint | `.pptx` |
| HTML | `.html`, `.htm` |
| Images | `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tif`, `.tiff`, `.heic`, `.heif` |

Legacy `.doc`, `.xls` and `.ppt` are rejected with a message explaining why;
Azure cannot read them. Uploads are capped at 4.5 MB, which is Vercel's
serverless request body limit.

---

## How it works

```
Document (PDF / Office / image)
 |
 |-- Stage 1: Azure AI Document Intelligence (prebuilt-layout)
 |              OCR, reading order, table reconstruction, paragraph roles,
 |              page geometry, selection marks -> Markdown
 |
 |-- Stage 2: Deterministic rules engine (lib/extract.ts)
 |              Layout output -> typed candidate fields, with provenance
 |
 |-- Stage 3: Reconciliation (lib/finance.ts)
                Subtotal exclusion, liquidity banding, net position,
                cashflow, look-back exposure, stated-versus-derived deltas
```

**No language model is involved at any point.** Stage 2 is a lexicon and a set
of ordered rules over the structured output Azure returns. Every candidate is
read from a specific cell or sentence, and every line in the UI carries the
provenance that says which one.

What that buys: the same document always yields the same fields, every figure
traces back to the text it came from, and nothing is ever invented. What it
costs: the engine recognises only what its lexicon describes, so an unusual
layout yields *fewer* candidates rather than wrong ones. Both are deliberate.

### Rules the engine enforces

| Rule | Why it matters |
|---|---|
| Unstated values stay `null`, never `0` | A missing balance and a zero balance are different facts |
| `is_subtotal` lines are detected and excluded from sums | Stops "total on deposit" being counted against its own sub-accounts |
| A negative balance in an asset column becomes a **liability** | A negative cash sweep is a margin debit, not a negative asset |
| Outstanding balances are always recorded positive | Sign conventions differ between documents |
| Decoy columns are rejected outright | Opening balance, cost basis and YTD sit right beside the current value |
| Transfers between the subject's own accounts are neither income nor gifts | A common false positive in look-back screening |
| Annual figures are converted to monthly and flagged as converted | Quarterly income is not monthly income |
| An insurance benefit pool is **coverage**, not an asset | It cannot be withdrawn, surrendered or assigned |
| Survivor benefits payable on a future death are `is_conditional` | Not current income |
| Future-dated lump sums go to `timed_proceeds` | Not a current balance |
| Documents with amendment language raise a warning | Superseded figures are a frequent trap |
| Identity data is reported as **types only** | No name, address, SSN or DOB enters a financial field |

---

## Running locally

```bash
npm install
cp .env.example .env     # fill in your values
npm run dev              # http://localhost:3000
```

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `AZURE_DI_ENDPOINT` | yes | Document Intelligence resource endpoint |
| `AZURE_DI_KEY` | yes | Document Intelligence key |
| `APP_USERNAME` | yes | Sign-in username |
| `APP_PASSWORD` | yes | Sign-in password |
| `AUTH_SECRET` | no | Signs the session cookie. Derived from the password when unset. |

Azure portal, your Document Intelligence resource, **Keys and Endpoint**.

### Sign-in

A single fixed credential held in the environment, enforced by `proxy.ts` on
every page and API route. There is no fallback: with `APP_USERNAME` or
`APP_PASSWORD` unset, nobody can sign in and the login page says so.

This is a demo gate. It keeps a proof of concept off the open internet. It is
not an identity system, there are no user accounts or audit trail, and it is
**not a safeguard for protected health information**. Do not put real resident
data behind it.

---

## Deploying to Vercel

```bash
vercel link
vercel env add AZURE_DI_ENDPOINT
vercel env add AZURE_DI_KEY
vercel env add APP_USERNAME
vercel env add APP_PASSWORD
vercel env add AUTH_SECRET
vercel --prod
```

Both analysis routes declare `maxDuration = 300` and run on the Node.js
runtime.

---

## Test fixtures

Seventeen synthetic US financial documents ship in `public/samples/`, covering
the document types a senior-living admissions file actually contains. Each is
built around a specific extraction trap. The **Source document** tab shows the
raw file beside its extracted figures, and the **Fixture notes** tab carries the
reference notes.

Nothing is scored automatically. The comparison is a human's to make.

| # | Fixture | Category | Trap |
|---|---|---|---|
| 01 | Bank statement | Deposit accounts | Subtotal vs sub-accounts; own-account transfer that is not a gift |
| 02 | Brokerage and equity portfolio | Investments | Negative cash sweep; cost-basis decoy column; quarterly read as monthly |
| 03 | SSA award letter | Benefit income | Prose only, zero tables; gross vs net of Part B |
| 04 | Pension and annuity election | Benefit income | Conditional survivor continuation; annual and monthly for one benefit |
| 05 | Form 1099-R | Tax documents | Gross distribution vs taxable amount; annual read as monthly |
| 06 | LTC policy summary | Insurance coverage | Benefit pool is coverage, not an asset |
| 07 | Family asset and debt worksheet | Family disclosure | `???` placeholders; stated total that does not reconcile |
| 08 | Property settlement statement | Real estate | Superseded net-to-seller figure; future-dated proceeds |
| 09 | Consolidated couple summary | Household summary | Joint account double-counted across both residents |
| 10 | 401(k) participant statement | Retirement accounts | Outstanding plan loan; vested vs total balance |
| 11 | IRA statement and RMD notice | Retirement accounts | RMD is income, not a second asset; prior year-end is the RMD basis |
| 12 | Residential appraisal | Real estate | Comparable sale prices are not the subject's value; assessed vs market |
| 13 | Mortgage statement | Secured debt | Escrow balance does not reduce principal; payoff exceeds principal |
| 14 | Reverse mortgage (HECM) | Secured debt | Available credit line is not an asset; balance grows rather than amortises |
| 15 | Credit card and medical debt | Unsecured debt | Minimum payment is not the balance; billed charges are not owed |
| 16 | Whole life policy statement | Insurance coverage | Death benefit is not an asset; policy loan reduces surrender value |
| 17 | Assisted living invoice | Care costs | One-time community fee is not a recurring expense |

All fixtures are fictional. Regenerate them with:

```bash
node scripts/make-fixtures.mjs
```

The PDFs and `ground_truth.json` come from one source, so they cannot drift
apart.

---

## Project layout

```
app/
  api/status/              capability and fixture listing
  api/analyze/             upload -> both stages
  api/analyze-sample/      bundled fixture -> both stages
  api/sample-file/         serves a fixture for the raw document viewer
  api/auth/                sign in and out
  login/                   sign-in screen
  layout.tsx, page.tsx, globals.css, icon.svg
components/
  Workspace.tsx            orchestrator: intake, pipeline, results
  Intake.tsx               drop zone and fixture rail
  Pipeline.tsx             staged progress visualisation
  Results.tsx              tab shell
  RawDocument.tsx          source document viewer
  results/Position.tsx     the financial position dashboard
  results/Evidence.tsx     layout tables, markdown, structure, pages, JSON
  ui.tsx, TopBar.tsx, Backdrop.tsx, LoginForm.tsx
lib/
  azure.ts                 stage 1
  lexicon.ts               classification rules
  money.ts                 money, date and percentage parsing
  extract.ts               stage 2
  finance.ts               stage 3 and formatting
  schema.ts                the candidate-field shape
  documents.ts             accepted formats and magic-byte sniffing
  auth.ts                  the sign-in gate
  pipeline.ts              stage orchestration
scripts/
  make-fixtures.mjs        regenerates the fixture set
  layout.mjs               a small PDF layout engine
  fixtures-core.mjs        fixtures 01 to 09
  fixtures-extended.mjs    fixtures 10 to 17
proxy.ts                   gates every page and API route
```

**Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4,
Motion, Azure AI Document Intelligence. One light theme, no dark variant.
