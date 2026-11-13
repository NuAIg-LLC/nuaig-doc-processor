import type { Extraction } from "./schema";

export type TableCell = {
  content: string;
  kind: string;
  rowSpan: number;
  colSpan: number;
};

export type LayoutTable = {
  rowCount: number;
  columnCount: number;
  cellCount: number;
  page: number | null;
  caption: string | null;
  grid: (TableCell | null)[][];
};

export type LayoutParagraph = {
  role: string | null;
  content: string;
  page: number | null;
};

export type LayoutPage = {
  pageNumber: number;
  width: number | null;
  height: number | null;
  unit: string | null;
  angle: number | null;
  lineCount: number;
  wordCount: number;
  selectionMarkCount: number;
  barcodeCount: number;
  lines: string[];
  selectionMarks: { state: string; confidence: number | null }[];
};

export type LayoutResult = {
  markdown: string;
  provider: string;
  modelId: string;
  apiVersion: string | null;
  contentFormat: string;
  pageCount: number;
  tableCount: number;
  paragraphCount: number;
  wordCount: number;
  lineCount: number;
  selectionMarkCount: number;
  figureCount: number;
  languageCount: number;
  styleCount: number;
  keyValuePairCount: number;
  serviceWarnings: string[];
  tables: LayoutTable[];
  paragraphs: LayoutParagraph[];
  paragraphRoles: Record<string, number>;
  pages: LayoutPage[];
};

export type { Extraction };

export type GroundTruth = Record<string, unknown>;

export type AnalysisResponse = {
  filename: string;
  elapsedSeconds: number;
  layoutSeconds: number;
  extractSeconds: number;
  layout: LayoutResult;
  extraction: Extraction;
  groundTruth: GroundTruth | null;
};

export type ErrorResponse = { error: string; detail?: string };

export type SampleInfo = {
  name: string;
  title: string;
  blurb: string | null;
  category: string | null;
  sizeKb: number;
};

export type StatusResponse = {
  azure: { ready: boolean; endpointHost: string | null; model: string };
  engine: { ready: boolean; engine: string };
  samples: SampleInfo[];
};
