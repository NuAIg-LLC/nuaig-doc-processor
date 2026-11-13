"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlignLeft,
  Braces,
  Clock,
  FileCode2,
  FileText,
  FlaskConical,
  Grid3x3,
  Layers,
  ScanText,
  TriangleAlert,
  Wallet,
  FileSearch,
} from "lucide-react";
import clsx from "clsx";

import { Card, Empty, Pill, SectionTitle, riseIn, stagger } from "./ui";
import Position from "./results/Position";
import RawDocument from "./RawDocument";
import {
  Markdown,
  Overview,
  Pages,
  RawJson,
  Structure,
  Tables,
} from "./results/Evidence";
import type { AnalysisResponse } from "@/lib/types";

type TabKey =
  | "position"
  | "source"
  | "overview"
  | "tables"
  | "structure"
  | "markdown"
  | "pages"
  | "json"
  | "fixture";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }[] = [
  { key: "position", label: "Position", icon: Wallet },
  { key: "source", label: "Source document", icon: FileSearch },
  { key: "overview", label: "Overview", icon: Layers },
  { key: "tables", label: "Tables", icon: Grid3x3 },
  { key: "structure", label: "Structure", icon: AlignLeft },
  { key: "markdown", label: "Markdown", icon: FileCode2 },
  { key: "pages", label: "Pages", icon: ScanText },
  { key: "json", label: "JSON", icon: Braces },
  { key: "fixture", label: "Fixture notes", icon: FlaskConical },
];

function Fixture({ gt }: { gt: Record<string, unknown> | null }) {
  if (!gt) {
    return (
      <Empty icon={FlaskConical}>
        No reference notes on file. These exist only for the nine bundled test
        fixtures: an uploaded document has nothing to compare against.
      </Empty>
    );
  }

  const traps = Array.isArray(gt.traps) ? (gt.traps as string[]) : [];
  const tests = Array.isArray(gt.tests) ? (gt.tests as string[]) : [];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
      <motion.div variants={riseIn}>
        <Card className="p-5">
          <SectionTitle icon={FlaskConical}>About this fixture</SectionTitle>
          <p className="mb-4 text-[12.5px] leading-snug text-muted">
            Reference notes describing what this synthetic document contains and what
            it was built to catch. Nothing here is compared automatically: it is
            context for a human reading the Position tab.
          </p>

          {typeof gt.layout === "string" && (
            <p
              className="mb-4 rounded-xl px-3.5 py-2.5 text-[13px] leading-snug"
              style={{ background: "color-mix(in oklab, var(--brand) 10%, transparent)" }}
            >
              <strong className="font-semibold">Layout:</strong> {gt.layout}
            </p>
          )}

          {tests.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted">
                What it tests
              </p>
              <div className="flex flex-wrap gap-1.5">
                {tests.map((t, i) => (
                  <Pill key={i} tone="brand">
                    {t}
                  </Pill>
                ))}
              </div>
            </div>
          )}

          {traps.length > 0 && (
            <div>
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted">
                Known traps
              </p>
              <div className="flex flex-col gap-2">
                {traps.map((t, i) => (
                  <div
                    key={i}
                    className="flex gap-2.5 rounded-xl px-3 py-2.5"
                    style={{ background: "color-mix(in oklab, var(--warn) 10%, transparent)" }}
                  >
                    <TriangleAlert
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      strokeWidth={2.3}
                      style={{ color: "var(--warn)" }}
                    />
                    <p className="text-[12.5px] leading-snug text-ink-2">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <motion.div variants={riseIn}>
        <RawJson data={gt} title="Expected values" />
      </motion.div>
    </motion.div>
  );
}

export default function Results({
  result,
  sourceUrl,
  uploadedObjectUrl,
}: {
  result: AnalysisResponse;
  sourceUrl: string | null;
  uploadedObjectUrl: string | null;
}) {
  const [tab, setTab] = useState<TabKey>("position");
  const tabs = TABS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-4"
    >
      {/* document header ---------------------------------------------------- */}
      <Card className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <FileText className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} />
          <span className="font-mono text-[13.5px] font-medium">{result.filename}</span>
          <Pill tone="brand">
            {result.layout.pageCount} page{result.layout.pageCount === 1 ? "" : "s"}
          </Pill>
          <Pill tone="neutral">
            {result.layout.tableCount} table{result.layout.tableCount === 1 ? "" : "s"}
          </Pill>
          <div className="flex-1" />
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] tnum text-muted">
            <Clock className="h-3 w-3" strokeWidth={2.2} />
            {result.layoutSeconds}s layout
            {" · "}
            {result.extractSeconds < 0.05
              ? "<0.05s extract"
              : `${result.extractSeconds}s extract`}
          </span>
        </div>
      </Card>

      {/* tabs ---------------------------------------------------------------- */}
      <div className="sticky top-[61px] z-40 -mx-1 overflow-x-auto px-1 py-1">
        <div
          className="glass inline-flex gap-0.5 rounded-2xl p-1"
          style={{ minWidth: "max-content" }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  "relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                  active ? "text-ink" : "text-muted hover:text-ink-2",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: "color-mix(in oklab, var(--brand) 18%, transparent)",
                      boxShadow:
                        "inset 0 0 0 1px color-mix(in oklab, var(--brand) 32%, transparent)",
                    }}
                  />
                )}
                <Icon className="relative h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="relative whitespace-nowrap">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* pane ---------------------------------------------------------------- */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        >
          {tab === "position" && <Position x={result.extraction} />}
          {tab === "source" && (
            <RawDocument
              src={sourceUrl}
              filename={result.filename}
              uploadedObjectUrl={uploadedObjectUrl}
            />
          )}
          {tab === "overview" && <Overview layout={result.layout} />}
          {tab === "tables" && <Tables layout={result.layout} />}
          {tab === "structure" && <Structure layout={result.layout} />}
          {tab === "markdown" && <Markdown layout={result.layout} />}
          {tab === "pages" && <Pages layout={result.layout} />}
          {tab === "json" && (
            <div className="flex flex-col gap-4">
              <RawJson data={result.extraction} title="Extracted fields" />
              <RawJson data={result.layout} title="Azure layout response" />
            </div>
          )}
          {tab === "fixture" && <Fixture gt={result.groundTruth} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
