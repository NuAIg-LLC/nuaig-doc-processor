import { NextResponse } from "next/server";

import { rejectionReason, sniff } from "@/lib/documents";
import { runPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Vercel caps a serverless request body at 4.5 MB. */
const MAX_BYTES = 4.5 * 1024 * 1024;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was attached." }, { status: 400 });
  }

  const name = file.name.split(/[\/]/).pop() || "upload";
  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 4.5 MB.` },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniff(bytes, name);
  const reason = rejectionReason(type, name);
  if (reason) {
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  try {
    return NextResponse.json(await runPipeline(bytes, name));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
