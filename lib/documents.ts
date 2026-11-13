/**
 * What the intake accepts, and how a file is identified.
 *
 * Azure Document Intelligence `prebuilt-layout` reads PDF, Office documents
 * (.docx, .xlsx, .pptx), HTML and the common image formats directly, so the
 * app does not convert anything. It identifies the file, checks the service
 * can read it, and hands the bytes over.
 *
 * Identification is by magic bytes first, extension second. A file is never
 * trusted on its name alone.
 */

export type DocKind = "pdf" | "image" | "word" | "excel" | "powerpoint" | "html" | "unknown";

export type DocType = {
  kind: DocKind;
  /** Human label for the UI. */
  label: string;
  /** Media type to serve the file back with. */
  mime: string;
  /** Can the browser show this inline in the raw-document viewer? */
  previewable: boolean;
};

const BY_EXTENSION: Record<string, DocType> = {
  pdf: { kind: "pdf", label: "PDF", mime: "application/pdf", previewable: true },

  png: { kind: "image", label: "PNG image", mime: "image/png", previewable: true },
  jpg: { kind: "image", label: "JPEG image", mime: "image/jpeg", previewable: true },
  jpeg: { kind: "image", label: "JPEG image", mime: "image/jpeg", previewable: true },
  bmp: { kind: "image", label: "Bitmap image", mime: "image/bmp", previewable: true },
  tif: { kind: "image", label: "TIFF image", mime: "image/tiff", previewable: false },
  tiff: { kind: "image", label: "TIFF image", mime: "image/tiff", previewable: false },
  heic: { kind: "image", label: "HEIF image", mime: "image/heic", previewable: false },
  heif: { kind: "image", label: "HEIF image", mime: "image/heif", previewable: false },

  docx: {
    kind: "word",
    label: "Word document",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    previewable: false,
  },
  xlsx: {
    kind: "excel",
    label: "Excel workbook",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    previewable: false,
  },
  pptx: {
    kind: "powerpoint",
    label: "PowerPoint deck",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    previewable: false,
  },

  html: { kind: "html", label: "HTML document", mime: "text/html", previewable: false },
  htm: { kind: "html", label: "HTML document", mime: "text/html", previewable: false },
};

/** Extensions the file picker offers and the server accepts. */
export const ACCEPTED_EXTENSIONS = Object.keys(BY_EXTENSION);

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",");

/** Formats Azure reads but that the browser cannot render inline. */
export const UNKNOWN_TYPE: DocType = {
  kind: "unknown",
  label: "Unrecognised file",
  mime: "application/octet-stream",
  previewable: false,
};

export function typeFromName(filename: string): DocType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION[ext] ?? UNKNOWN_TYPE;
}

function startsWith(buf: Buffer, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false;
  return bytes.every((b, i) => buf[i] === b);
}

/**
 * Identify a file from its leading bytes.
 *
 * Office files are ZIP containers, so a `PK` header is ambiguous. In that case
 * the extension decides which Office format it is, since the alternative is
 * unzipping the container just to read one entry name.
 */
export function sniff(buf: Buffer, filename: string): DocType {
  const byName = typeFromName(filename);

  if (startsWith(buf, [0x25, 0x50, 0x44, 0x46])) return BY_EXTENSION.pdf; // %PDF
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47])) return BY_EXTENSION.png;
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return BY_EXTENSION.jpg;
  if (startsWith(buf, [0x42, 0x4d])) return BY_EXTENSION.bmp;
  if (startsWith(buf, [0x49, 0x49, 0x2a, 0x00]) || startsWith(buf, [0x4d, 0x4d, 0x00, 0x2a])) {
    return BY_EXTENSION.tif;
  }
  // HEIF/HEIC: "ftyp" box at offset 4.
  if (buf.length > 12 && buf.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("latin1");
    if (/^(heic|heix|hevc|mif1|heim|msf1)$/.test(brand)) return BY_EXTENSION.heic;
  }

  // ZIP container: an Office document, or something else entirely.
  if (startsWith(buf, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buf, [0x50, 0x4b, 0x05, 0x06])) {
    if (byName.kind === "word" || byName.kind === "excel" || byName.kind === "powerpoint") {
      return byName;
    }
    return UNKNOWN_TYPE;
  }

  // Legacy OLE compound file: .doc / .xls / .ppt. Azure cannot read these.
  if (startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0])) {
    return {
      kind: "unknown",
      label: "Legacy Office format",
      mime: "application/octet-stream",
      previewable: false,
    };
  }

  const head = buf.subarray(0, 512).toString("latin1").trimStart().toLowerCase();
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) return BY_EXTENSION.html;

  return byName;
}

/** Why a file was rejected, phrased for the person who uploaded it. */
export function rejectionReason(type: DocType, filename: string): string | null {
  if (type.label === "Legacy Office format") {
    return "That is a legacy Office file (.doc, .xls or .ppt). Save it as .docx, .xlsx or .pptx, or export it to PDF, and upload it again.";
  }
  if (type.kind === "unknown") {
    const ext = filename.split(".").pop()?.toLowerCase();
    return `${ext ? `.${ext} files are` : "That file type is"} not supported. Accepted formats are PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), HTML and images (PNG, JPEG, BMP, TIFF, HEIF).`;
  }
  return null;
}
