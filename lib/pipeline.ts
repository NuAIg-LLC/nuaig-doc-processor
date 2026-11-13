import { readFile } from "node:fs/promises";
import path from "node:path";

import { analyzeLayout } from "./azure";
import { extractFields } from "./extract";
import type { AnalysisResponse, GroundTruth } from "./types";

export const SAMPLES_DIR = path.join(process.cwd(), "public", "samples");

/** Reject anything that is not a bare filename sitting in the samples folder. */
export function safeSampleName(raw: string): string | null {
  const decoded = decodeURIComponent(raw);
  const name = path.basename(decoded);
  if (name !== decoded) return null;
  if (!/^[\w.-]+\.pdf$/i.test(name)) return null;
  return name;
}

let groundTruthCache: Record<string, GroundTruth> | null = null;

export async function groundTruth(): Promise<Record<string, GroundTruth>> {
  if (groundTruthCache) return groundTruthCache;
  try {
    const raw = await readFile(path.join(SAMPLES_DIR, "ground_truth.json"), "utf-8");
    groundTruthCache = JSON.parse(raw) as Record<string, GroundTruth>;
  } catch {
    groundTruthCache = {};
  }
  return groundTruthCache;
}

export function isPdf(buf: Buffer): boolean {
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

/** Run both stages and shape the response the UI consumes. */
export async function runPipeline(pdf: Buffer, filename: string): Promise<AnalysisResponse> {
  const t0 = Date.now();
  const layout = await analyzeLayout(pdf);
  const t1 = Date.now();

  const extraction = extractFields(layout, filename);
  const t2 = Date.now();

  const gt = await groundTruth();

  return {
    filename,
    elapsedSeconds: Math.round(((t2 - t0) / 1000) * 100) / 100,
    layoutSeconds: Math.round(((t1 - t0) / 1000) * 100) / 100,
    extractSeconds: Math.round(((t2 - t1) / 1000) * 1000) / 1000,
    layout,
    extraction,
    groundTruth: gt[filename] ?? null,
  };
}
