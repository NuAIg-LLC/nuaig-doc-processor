import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { azureStatus } from "@/lib/azure";
import { engineStatus } from "@/lib/extract";
import { SAMPLES_DIR } from "@/lib/pipeline";
import type { SampleInfo, StatusResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Note = { title?: string; category?: string; layout?: string };

export async function GET() {
  let samples: SampleInfo[] = [];

  try {
    const files = (await readdir(SAMPLES_DIR))
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .sort();

    let notes: Record<string, Note> = {};
    try {
      notes = JSON.parse(await readFile(path.join(SAMPLES_DIR, "ground_truth.json"), "utf-8"));
    } catch {
      notes = {};
    }

    samples = await Promise.all(
      files.map(async (name) => {
        let sizeKb = 0;
        try {
          sizeKb = Math.round((await stat(path.join(SAMPLES_DIR, name))).size / 1024);
        } catch {
          sizeKb = 0;
        }
        const note = notes[name] ?? {};
        return {
          name,
          title:
            note.title ??
            name.replace(/^\d+_/, "").replace(/\.pdf$/i, "").replace(/_/g, " "),
          blurb: note.layout ?? null,
          category: note.category ?? null,
          sizeKb,
        };
      }),
    );
  } catch {
    samples = [];
  }

  const body: StatusResponse = {
    azure: azureStatus(),
    engine: engineStatus(),
    samples,
  };
  return NextResponse.json(body);
}
