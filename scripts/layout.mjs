/**
 * A small layout engine over pdf-lib: text, rules, key/value pairs and ruled
 * tables with a running cursor and automatic page breaks.
 *
 * Only used to build the test fixtures in scripts/make-fixtures.mjs. Nothing
 * in the application imports it.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const INK = rgb(0.08, 0.09, 0.12);
export const SOFT = rgb(0.42, 0.45, 0.52);
export const LINE = rgb(0.78, 0.8, 0.84);
export const BAND = rgb(0.93, 0.94, 0.96);
export const ACCENT = rgb(0.13, 0.26, 0.47);
export const RED = rgb(0.68, 0.13, 0.17);

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 54;

export class Sheet {
  constructor(pdf, fonts) {
    this.pdf = pdf;
    this.fonts = fonts;
    this.pages = [];
    this.newPage();
  }

  newPage() {
    this.p = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.p);
    this.y = PAGE_H - MARGIN;
    return this.p;
  }

  /** Reserve vertical space, breaking to a new page when it will not fit. */
  need(h) {
    if (this.y - h < MARGIN) this.newPage();
  }

  get width() {
    return PAGE_W - MARGIN * 2;
  }

  font(weight = "regular") {
    return weight === "bold" ? this.fonts.bold : weight === "italic" ? this.fonts.italic : this.fonts.regular;
  }

  widthOf(text, size, weight) {
    return this.font(weight).widthOfTextAtSize(String(text), size);
  }

  /** Draw one line of text. `align` may be left, right or center. */
  line(text, opts = {}) {
    const {
      size = 9.5,
      weight = "regular",
      color = INK,
      x = MARGIN,
      align = "left",
      width = this.width,
      gap = 3,
    } = opts;

    const str = String(text ?? "");
    this.need(size + gap);

    let drawX = x;
    if (align === "right") drawX = x + width - this.widthOf(str, size, weight);
    else if (align === "center") drawX = x + (width - this.widthOf(str, size, weight)) / 2;

    this.p.drawText(str, {
      x: drawX,
      y: this.y - size,
      size,
      font: this.font(weight),
      color,
    });
    this.y -= size + gap;
    return this;
  }

  /** Word-wrapped paragraph. */
  para(text, opts = {}) {
    const { size = 9.5, weight = "regular", color = INK, width = this.width, gap = 4, lead = 4.2 } = opts;
    const words = String(text).split(/\s+/);
    let current = "";

    const flush = () => {
      if (!current) return;
      this.need(size + lead);
      this.p.drawText(current, {
        x: MARGIN,
        y: this.y - size,
        size,
        font: this.font(weight),
        color,
      });
      this.y -= size + lead;
      current = "";
    };

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (this.widthOf(next, size, weight) > width) {
        flush();
        current = word;
      } else {
        current = next;
      }
    }
    flush();
    this.y -= gap;
    return this;
  }

  space(h = 8) {
    this.y -= h;
    return this;
  }

  rule(opts = {}) {
    const { color = LINE, thickness = 0.8, gap = 6 } = opts;
    this.need(gap * 2);
    this.y -= gap;
    this.p.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_W - MARGIN, y: this.y },
      thickness,
      color,
    });
    this.y -= gap;
    return this;
  }

  /** Letterhead block: institution name, address lines, document title. */
  letterhead({ org, lines = [], title, subtitle }) {
    this.line(org, { size: 15, weight: "bold", color: ACCENT, gap: 2 });
    for (const l of lines) this.line(l, { size: 8, color: SOFT, gap: 1.5 });
    this.space(6);
    this.rule({ color: ACCENT, thickness: 1.4, gap: 4 });
    if (title) this.line(title, { size: 12.5, weight: "bold", gap: 2 });
    if (subtitle) this.line(subtitle, { size: 9, color: SOFT });
    this.space(6);
    return this;
  }

  heading(text) {
    this.space(6);
    this.need(22);
    this.p.drawRectangle({
      x: MARGIN,
      y: this.y - 14,
      width: this.width,
      height: 16,
      color: BAND,
    });
    this.p.drawText(String(text).toUpperCase(), {
      x: MARGIN + 6,
      y: this.y - 11,
      size: 8.5,
      font: this.fonts.bold,
      color: ACCENT,
    });
    this.y -= 22;
    return this;
  }

  /** Two-column label / value pairs. */
  kv(pairs, opts = {}) {
    const { labelWidth = 190, size = 9.5, gap = 3.5 } = opts;
    for (const [label, value, style] of pairs) {
      this.need(size + gap);
      this.p.drawText(String(label), {
        x: MARGIN,
        y: this.y - size,
        size,
        font: this.fonts.regular,
        color: SOFT,
      });
      const weight = style === "bold" ? "bold" : "regular";
      const color = style === "red" ? RED : INK;
      this.p.drawText(String(value), {
        x: MARGIN + labelWidth,
        y: this.y - size,
        size,
        font: this.font(weight),
        color,
      });
      this.y -= size + gap;
    }
    return this;
  }

  /**
   * A ruled table.
   *
   * columns: [{ label, width, align }]  widths are relative and normalised.
   * rows:    [[cell, ...]] where a cell is a string, or { text, style }.
   */
  table({ columns, rows, size = 8.5, headerSize = 7.8, rowHeight = 15 }) {
    const totalWeight = columns.reduce((n, c) => n + (c.width ?? 1), 0);
    const widths = columns.map((c) => ((c.width ?? 1) / totalWeight) * this.width);

    const drawHeader = () => {
      this.need(rowHeight + 4);
      this.p.drawRectangle({
        x: MARGIN,
        y: this.y - rowHeight + 3,
        width: this.width,
        height: rowHeight,
        color: BAND,
      });
      let x = MARGIN;
      columns.forEach((col, i) => {
        const label = String(col.label ?? "");
        const w = widths[i];
        const tw = this.fonts.bold.widthOfTextAtSize(label, headerSize);
        const tx =
          col.align === "right" ? x + w - tw - 5 : col.align === "center" ? x + (w - tw) / 2 : x + 5;
        this.p.drawText(label, {
          x: tx,
          y: this.y - rowHeight + 8,
          size: headerSize,
          font: this.fonts.bold,
          color: ACCENT,
        });
        x += w;
      });
      this.y -= rowHeight + 1;
    };

    drawHeader();

    for (const row of rows) {
      if (this.y - rowHeight < MARGIN) {
        this.newPage();
        drawHeader();
      }

      const cells = row.map((c) => (typeof c === "object" && c !== null ? c : { text: c }));
      const emphasised = cells.some((c) => c.style === "bold" || c.style === "total");

      if (emphasised) {
        this.p.drawRectangle({
          x: MARGIN,
          y: this.y - rowHeight + 3,
          width: this.width,
          height: rowHeight,
          color: rgb(0.965, 0.97, 0.98),
        });
      }

      let x = MARGIN;
      columns.forEach((col, i) => {
        const cell = cells[i] ?? { text: "" };
        const text = String(cell.text ?? "");
        const w = widths[i];
        const weight = cell.style === "bold" || cell.style === "total" ? "bold" : "regular";
        const color = cell.style === "red" ? RED : cell.style === "soft" ? SOFT : INK;
        const f = this.font(weight);

        // Trim to fit rather than overflow into the next column.
        let shown = text;
        while (shown && f.widthOfTextAtSize(shown, size) > w - 10) {
          shown = shown.slice(0, -1);
        }
        if (shown !== text) shown = `${shown.slice(0, -1)}.`;

        const tw = f.widthOfTextAtSize(shown, size);
        const tx =
          col.align === "right" ? x + w - tw - 5 : col.align === "center" ? x + (w - tw) / 2 : x + 5;

        this.p.drawText(shown, { x: tx, y: this.y - rowHeight + 8, size, font: f, color });
        x += w;
      });

      this.p.drawLine({
        start: { x: MARGIN, y: this.y - rowHeight + 2 },
        end: { x: PAGE_W - MARGIN, y: this.y - rowHeight + 2 },
        thickness: 0.4,
        color: LINE,
      });
      this.y -= rowHeight;
    }

    this.y -= 6;
    return this;
  }

  /** A boxed callout, used for notices and disclosures. */
  callout(text, opts = {}) {
    const { size = 8.5, color = rgb(0.98, 0.97, 0.9), border = rgb(0.75, 0.66, 0.35) } = opts;
    const lines = [];
    const words = String(text).split(/\s+/);
    let current = "";
    for (const w of words) {
      const next = current ? `${current} ${w}` : w;
      if (this.widthOf(next, size) > this.width - 20) {
        lines.push(current);
        current = w;
      } else current = next;
    }
    if (current) lines.push(current);

    const h = lines.length * (size + 3) + 12;
    this.need(h + 8);
    this.p.drawRectangle({
      x: MARGIN,
      y: this.y - h,
      width: this.width,
      height: h,
      color,
      borderColor: border,
      borderWidth: 0.8,
    });
    let ty = this.y - 12;
    for (const l of lines) {
      this.p.drawText(l, { x: MARGIN + 10, y: ty, size, font: this.fonts.regular, color: INK });
      ty -= size + 3;
    }
    this.y -= h + 8;
    return this;
  }

  /** Page numbers, drawn once every page exists. */
  paginate(label) {
    this.pages.forEach((page, i) => {
      page.drawText(`Page ${i + 1} of ${this.pages.length}`, {
        x: PAGE_W - MARGIN - 70,
        y: 32,
        size: 7.5,
        font: this.fonts.regular,
        color: SOFT,
      });
      if (label) {
        page.drawText(label, {
          x: MARGIN,
          y: 32,
          size: 7.5,
          font: this.fonts.regular,
          color: SOFT,
        });
      }
    });
  }
}

export async function buildSheet() {
  const pdf = await PDFDocument.create();
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  return { pdf, sheet: new Sheet(pdf, fonts) };
}

/** $1,234.56 */
export function usd(n, opts = {}) {
  const { cents = true, paren = false } = opts;
  const abs = Math.abs(n);
  const body = abs.toLocaleString("en-US", {
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
  if (n < 0) return paren ? `($${body})` : `-$${body}`;
  return `$${body}`;
}
