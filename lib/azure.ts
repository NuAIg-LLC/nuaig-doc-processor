/**
 * Stage 1: Azure AI Document Intelligence (`prebuilt-layout`).
 *
 * Takes a PDF buffer and returns everything the layout model produces:
 * Markdown, reconstructed tables, paragraph roles, per-page geometry and
 * line-level text.
 */

import DocumentIntelligence, {
  isUnexpected,
  getLongRunningPoller,
  type AnalyzeOperationOutput,
  type AnalyzeResultOutput,
  type DocumentTableOutput,
} from "@azure-rest/ai-document-intelligence";

import type { LayoutResult, LayoutTable, TableCell } from "./types";

const ENDPOINT = process.env.AZURE_DI_ENDPOINT ?? "";
const KEY = process.env.AZURE_DI_KEY ?? "";

function isPlaceholder(v: string): boolean {
  return !v || v.startsWith("<") || v.includes("<your-resource>");
}

export const AZURE_READY = !(isPlaceholder(ENDPOINT) || isPlaceholder(KEY));

export function azureStatus() {
  return {
    ready: AZURE_READY,
    // Host only: the key never leaves the server.
    endpointHost: AZURE_READY
      ? ENDPOINT.split("//").pop()?.replace(/\/$/, "") ?? null
      : null,
    model: "prebuilt-layout",
  };
}

/**
 * Azure returns a flat cell list. Turn it into a dense grid the renderer can
 * walk row by row; cells swallowed by a row/column span become `null`.
 */
function tableToGrid(table: DocumentTableOutput): LayoutTable {
  const rows = table.rowCount;
  const cols = table.columnCount;

  const grid: (TableCell | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );
  const covered: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );

  for (const cell of table.cells) {
    const r = cell.rowIndex;
    const c = cell.columnIndex;
    const rs = cell.rowSpan || 1;
    const cs = cell.columnSpan || 1;
    if (r >= rows || c >= cols || covered[r][c]) continue;

    grid[r][c] = {
      content: cell.content || "",
      kind: String(cell.kind ?? "content"),
      rowSpan: rs,
      colSpan: cs,
    };

    for (let dr = 0; dr < rs; dr++) {
      for (let dc = 0; dc < cs; dc++) {
        if (r + dr < rows && c + dc < cols) covered[r + dr][c + dc] = true;
      }
    }
  }

  return {
    rowCount: rows,
    columnCount: cols,
    cellCount: table.cells.length,
    page: table.boundingRegions?.[0]?.pageNumber ?? null,
    caption: table.caption?.content ?? null,
    grid,
  };
}

function normalise(result: AnalyzeResultOutput): LayoutResult {
  const pages = (result.pages ?? []).map((p) => ({
    pageNumber: p.pageNumber,
    width: p.width ?? null,
    height: p.height ?? null,
    unit: p.unit ? String(p.unit) : null,
    angle: p.angle != null ? Math.round(p.angle * 1000) / 1000 : null,
    lineCount: p.lines?.length ?? 0,
    wordCount: p.words?.length ?? 0,
    selectionMarkCount: p.selectionMarks?.length ?? 0,
    barcodeCount: p.barcodes?.length ?? 0,
    lines: (p.lines ?? []).map((l) => l.content),
    selectionMarks: (p.selectionMarks ?? []).map((s) => ({
      state: String(s.state),
      confidence: s.confidence != null ? Math.round(s.confidence * 1000) / 1000 : null,
    })),
  }));

  const paragraphs = (result.paragraphs ?? []).map((para) => ({
    role: para.role ? String(para.role) : null,
    content: para.content || "",
    page: para.boundingRegions?.[0]?.pageNumber ?? null,
  }));

  const tables = (result.tables ?? []).map(tableToGrid);

  const paragraphRoles: Record<string, number> = {};
  for (const para of paragraphs) {
    const key = para.role ?? "(body text)";
    paragraphRoles[key] = (paragraphRoles[key] ?? 0) + 1;
  }

  return {
    markdown: result.content ?? "",
    provider: "Azure Document Intelligence: prebuilt-layout",
    modelId: result.modelId,
    apiVersion: result.apiVersion ?? null,
    contentFormat: String(result.contentFormat ?? "markdown"),
    pageCount: pages.length,
    tableCount: tables.length,
    paragraphCount: paragraphs.length,
    wordCount: pages.reduce((n, p) => n + p.wordCount, 0),
    lineCount: pages.reduce((n, p) => n + p.lineCount, 0),
    selectionMarkCount: pages.reduce((n, p) => n + p.selectionMarkCount, 0),
    figureCount: result.figures?.length ?? 0,
    languageCount: result.languages?.length ?? 0,
    styleCount: result.styles?.length ?? 0,
    keyValuePairCount: result.keyValuePairs?.length ?? 0,
    serviceWarnings: (result.warnings ?? []).map((w) => String(w.message ?? w)),
    tables,
    paragraphs,
    paragraphRoles,
    pages,
  };
}

/** PDF bytes → full layout analysis. Throws on service failure. */
export async function analyzeLayout(pdf: Buffer): Promise<LayoutResult> {
  if (!AZURE_READY) {
    throw new Error(
      "Azure credentials are not configured. Set AZURE_DI_ENDPOINT and AZURE_DI_KEY.",
    );
  }

  const client = DocumentIntelligence(ENDPOINT, { key: KEY });

  const initial = await client
    .path("/documentModels/{modelId}:analyze", "prebuilt-layout")
    .post({
      contentType: "application/json",
      body: { base64Source: pdf.toString("base64") },
      queryParameters: { outputContentFormat: "markdown" },
    });

  if (isUnexpected(initial)) {
    const err = initial.body?.error;
    throw new Error(
      `Azure Document Intelligence: ${err?.code ?? "error"}: ${err?.message ?? "unknown failure"}`,
    );
  }

  const poller = getLongRunningPoller(client, initial);
  const operation = (await poller.pollUntilDone()).body as AnalyzeOperationOutput;

  if (operation.status !== "succeeded" || !operation.analyzeResult) {
    throw new Error(
      `Analysis ${operation.status}: ${operation.error?.message ?? "no result returned"}`,
    );
  }

  return normalise(operation.analyzeResult);
}
