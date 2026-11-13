import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { SAMPLES_DIR, runPipeline, safeSampleName } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name: raw } = await params;
  const name = safeSampleName(raw);
  if (!name) {
    return NextResponse.json({ error: "Invalid sample name." }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(SAMPLES_DIR, name));
  } catch {
    return NextResponse.json({ error: `No sample named ${name}` }, { status: 404 });
  }

  try {
    return NextResponse.json(await runPipeline(bytes, name));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
