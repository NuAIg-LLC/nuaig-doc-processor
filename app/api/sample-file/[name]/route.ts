import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { SAMPLES_DIR, safeSampleName } from "@/lib/pipeline";
import { typeFromName } from "@/lib/documents";

export const runtime = "nodejs";

/** Serves a bundled fixture so the raw document can be read in the browser. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name: raw } = await params;
  const name = safeSampleName(raw);
  if (!name) {
    return NextResponse.json({ error: "Invalid sample name." }, { status: 400 });
  }

  try {
    const bytes = await readFile(path.join(SAMPLES_DIR, name));
    const type = typeFromName(name);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": type.mime,
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: `No sample named ${name}` }, { status: 404 });
  }
}
