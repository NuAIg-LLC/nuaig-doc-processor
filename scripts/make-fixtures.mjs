/**
 * Regenerate the test fixture PDFs and the ground truth file that describes
 * them. Run with:  node scripts/make-fixtures.mjs
 *
 * The fixtures and their reference notes come from one source, so they cannot
 * drift apart. Every figure is fictional.
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSheet } from "./layout.mjs";
import { CORE } from "./fixtures-core.mjs";
import { EXTENDED } from "./fixtures-extended.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "samples");

const FIXTURES = [...CORE, ...EXTENDED];

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const groundTruth = {
    _about:
      "Reference notes for each synthetic test document. All documents are fictional. Nothing here is compared automatically; it is context for a human reviewing the extracted position.",
    _pii_note:
      "Every document deliberately contains identity data. The extractor must isolate financial fields from identity fields and report identity only as types, never values.",
  };

  for (const fx of FIXTURES) {
    const { pdf, sheet } = await buildSheet();
    fx.build(sheet);
    const bytes = await pdf.save();
    await writeFile(path.join(OUT, fx.file), bytes);

    groundTruth[fx.file] = {
      title: fx.title,
      category: fx.category,
      layout: fx.blurb,
      tests: fx.tests,
      traps: fx.traps,
      expected: fx.expected,
      pii_present: fx.pii,
    };

    console.log(
      `  ${fx.file.padEnd(42)} ${String(Math.round(bytes.length / 1024)).padStart(4)} KB  ${fx.category}`,
    );
  }

  await writeFile(
    path.join(OUT, "ground_truth.json"),
    JSON.stringify(groundTruth, null, 2),
    "utf-8",
  );

  console.log(`\n  ${FIXTURES.length} fixtures written to public/samples\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
