"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  AlignLeft,
  Check,
  Copy,
  FileCode2,
  Files,
  Grid3x3,
  Layers,
  ScanText,
} from "lucide-react";

import { Card, Empty, Pill, SectionTitle, riseIn, stagger } from "../ui";
import { num } from "@/lib/finance";
import type { LayoutResult, LayoutTable } from "@/lib/types";

const NUMERIC = /^[$\-(]?[\d,.]+%?\)?$/;

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard unavailable: nothing useful to show */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-muted transition-colors hover:border-line-2 hover:text-ink"
    >
      {done ? (
        <Check className="h-3 w-3" strokeWidth={2.6} style={{ color: "var(--asset)" }} />
      ) : (
        <Copy className="h-3 w-3" strokeWidth={2.2} />
      )}
      {done ? "Copied" : label}
    </button>
  );
}

function ReconstructedTable({ t, index }: { t: LayoutTable; index: number }) {
  return (
    <motion.div variants={riseIn}>
      <Card className="p-5">
        <SectionTitle
          icon={Grid3x3}
          right={
            <div className="flex items-center gap-1.5">
              <Pill tone="neutral">
                {t.rowCount}×{t.columnCount}
              </Pill>
              <Pill tone="neutral">{t.cellCount} cells</Pill>
              {t.page && <Pill tone="brand">page {t.page}</Pill>}
            </div>
          }
        >
          Table {index + 1}
        </SectionTitle>

        {t.caption && (
          <p className="mb-3 text-[12.5px] italic text-muted">{t.caption}</p>
        )}

        <div className="max-h-[460px] overflow-auto rounded-xl border border-line">
          <table className="doc-table grid-table">
            <tbody>
              {t.grid.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => {
                    if (!cell) return null;
                    const span = {
                      rowSpan: cell.rowSpan > 1 ? cell.rowSpan : undefined,
                      colSpan: cell.colSpan > 1 ? cell.colSpan : undefined,
                    };
                    const kind = cell.kind.toLowerCase();
                    const isNum = NUMERIC.test(cell.content.trim());

                    if (kind.includes("columnheader")) {
                      return (
                        <th key={c} {...span}>
                          {cell.content}
                        </th>
                      );
                    }
                    return (
                      <td
                        key={c}
                        {...span}
                        className={[
                          kind.includes("rowheader") ? "rowhead" : "",
                          isNum ? "numeric" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {cell.content}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

export function Tables({ layout }: { layout: LayoutResult }) {
  if (!layout.tables.length) {
    return (
      <Empty icon={Grid3x3}>
        No tables were detected. This document's figures sit in prose or in
        free-form layout: look at the Markdown and Structure views instead.
      </Empty>
    );
  }
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      {layout.tables.map((t, i) => (
        <ReconstructedTable key={i} t={t} index={i} />
      ))}
    </motion.div>
  );
}

export function Markdown({ layout }: { layout: LayoutResult }) {
  return (
    <Card className="p-5">
      <SectionTitle
        icon={FileCode2}
        right={
          <div className="flex items-center gap-1.5">
            <Pill tone="neutral">{num(layout.markdown.length)} chars</Pill>
            <Pill tone="brand">{layout.contentFormat}</Pill>
            <CopyButton text={layout.markdown} />
          </div>
        }
      >
        Markdown output
      </SectionTitle>
      <p className="mb-3 text-[12.5px] leading-snug text-muted">
        Exactly what Azure returned, and exactly what the extraction stage reads.
        Everything in the Position tab traces back to this text.
      </p>
      <pre
        className="max-h-[620px] overflow-auto rounded-xl border border-line p-4 font-mono text-[12px] leading-relaxed text-ink-2"
        style={{ background: "color-mix(in oklab, var(--muted) 7%, transparent)" }}
      >
        {layout.markdown}
      </pre>
    </Card>
  );
}

export function Structure({ layout }: { layout: LayoutResult }) {
  if (!layout.paragraphs.length) {
    return <Empty icon={AlignLeft}>No paragraphs were returned.</Empty>;
  }
  return (
    <Card className="p-5">
      <SectionTitle
        icon={AlignLeft}
        right={<Pill tone="neutral">{num(layout.paragraphCount)} paragraphs</Pill>}
      >
        Reading order
      </SectionTitle>
      <p className="mb-3 text-[12.5px] leading-snug text-muted">
        Paragraphs in reading order, with the role Azure assigned to each: titles,
        section headings, page headers and footers.
      </p>
      <div className="max-h-[620px] overflow-auto rounded-xl border border-line">
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: 46 }}>Pg</th>
              <th style={{ width: 130 }}>Role</th>
              <th>Content</th>
            </tr>
          </thead>
          <tbody>
            {layout.paragraphs.map((p, i) => (
              <tr key={i}>
                <td className="font-mono text-[11.5px] text-muted">{p.page ?? ""}</td>
                <td>{p.role ? <Pill tone="brand">{p.role}</Pill> : null}</td>
                <td className="text-ink-2">{p.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function Pages({ layout }: { layout: LayoutResult }) {
  if (!layout.pages.length) {
    return <Empty icon={Files}>No pages were returned.</Empty>;
  }
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      {layout.pages.map((p) => (
        <motion.div key={p.pageNumber} variants={riseIn}>
          <Card className="p-5">
            <SectionTitle
              icon={ScanText}
              right={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Pill tone="neutral">
                    {p.width}×{p.height} {p.unit?.toLowerCase()}
                  </Pill>
                  <Pill tone="neutral">skew {p.angle}°</Pill>
                  <Pill tone="neutral">{p.lineCount} lines</Pill>
                  <Pill tone="neutral">{p.wordCount} words</Pill>
                  {p.selectionMarkCount > 0 && (
                    <Pill tone="warn">{p.selectionMarkCount} checkbox</Pill>
                  )}
                </div>
              }
            >
              Page {p.pageNumber}
            </SectionTitle>

            {p.selectionMarks.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {p.selectionMarks.map((s, i) => (
                  <Pill key={i} tone={s.state === "selected" ? "asset" : "neutral"}>
                    {s.state}
                    {s.confidence != null && (
                      <span className="font-mono tnum opacity-70">{s.confidence}</span>
                    )}
                  </Pill>
                ))}
              </div>
            )}

            <div className="max-h-[340px] overflow-auto rounded-xl border border-line">
              {p.lines.map((line, i) => (
                <div
                  key={i}
                  className="flex gap-3 border-b border-line px-3 py-1 last:border-0 transition-colors hover:bg-[color-mix(in_oklab,var(--brand)_7%,transparent)]"
                >
                  <span className="w-8 shrink-0 select-none text-right font-mono text-[11px] tnum text-faint">
                    {i + 1}
                  </span>
                  <span className="font-mono text-[12px] leading-relaxed text-ink-2">
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

export function Overview({ layout }: { layout: LayoutResult }) {
  const tiles: [string, number][] = [
    ["Pages", layout.pageCount],
    ["Tables", layout.tableCount],
    ["Paragraphs", layout.paragraphCount],
    ["Lines", layout.lineCount],
    ["Words", layout.wordCount],
    ["Checkboxes", layout.selectionMarkCount],
    ["Figures", layout.figureCount],
    ["Styles", layout.styleCount],
  ];

  const roles = Object.entries(layout.paragraphRoles);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={riseIn}>
        <Card className="p-5">
          <SectionTitle icon={Layers}>What the layout model found</SectionTitle>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {tiles.map(([k, v], i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-line p-3.5"
                style={{
                  background:
                    v > 0 ? "color-mix(in oklab, var(--brand) 6%, transparent)" : "transparent",
                }}
              >
                <p className="text-[11.5px] text-muted">{k}</p>
                <p
                  className="mt-1 font-mono text-[22px] font-semibold leading-none tnum"
                  style={{ color: v > 0 ? "var(--ink)" : "var(--faint)" }}
                >
                  {num(v)}
                </p>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={riseIn} className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle icon={ScanText}>Analysis detail</SectionTitle>
          <dl className="grid gap-2 text-[12.5px]">
            {[
              ["Provider", layout.provider],
              ["Model", layout.modelId],
              ["API version", layout.apiVersion ?? "-"],
              ["Output format", layout.contentFormat],
              ["Markdown size", `${num(layout.markdown.length)} characters`],
              [
                "Key-value pairs",
                layout.keyValuePairCount === 0
                  ? "0: add-on feature, not enabled"
                  : num(layout.keyValuePairCount),
              ],
              ["Languages detected", num(layout.languageCount)],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="truncate text-right font-mono text-[12px] text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-5">
          <SectionTitle icon={AlignLeft}>Paragraph roles</SectionTitle>
          {roles.length === 0 ? (
            <Empty icon={AlignLeft}>No roles were assigned.</Empty>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {roles.map(([role, count]) => (
                <Pill key={role} tone={role === "(body text)" ? "neutral" : "brand"}>
                  {role}
                  <span className="font-mono tnum opacity-70">{count}</span>
                </Pill>
              ))}
            </div>
          )}

          {layout.serviceWarnings.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {layout.serviceWarnings.map((w, i) => (
                <p
                  key={i}
                  className="rounded-xl px-3 py-2 text-[12px] leading-snug"
                  style={{
                    background: "color-mix(in oklab, var(--warn) 10%, transparent)",
                    color: "var(--warn)",
                  }}
                >
                  {w}
                </p>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

export function RawJson({ data, title }: { data: unknown; title: string }) {
  const text = JSON.stringify(data, null, 2);
  return (
    <Card className="p-5">
      <SectionTitle
        icon={FileCode2}
        right={
          <div className="flex items-center gap-1.5">
            <Pill tone="neutral">{num(text.length)} chars</Pill>
            <CopyButton text={text} />
          </div>
        }
      >
        {title}
      </SectionTitle>
      <pre
        className="max-h-[680px] overflow-auto rounded-xl border border-line p-4 font-mono text-[11.5px] leading-relaxed text-ink-2"
        style={{ background: "color-mix(in oklab, var(--muted) 7%, transparent)" }}
      >
        {text}
      </pre>
    </Card>
  );
}
