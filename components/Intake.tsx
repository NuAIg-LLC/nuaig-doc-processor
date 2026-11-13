"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FileText, FolderOpen, Sparkles, UploadCloud } from "lucide-react";
import clsx from "clsx";

import { Card, Pill, riseIn, stagger } from "./ui";
import { ACCEPT_ATTRIBUTE, typeFromName } from "@/lib/documents";
import type { StatusResponse } from "@/lib/types";

const MAX_BYTES = 4.5 * 1024 * 1024;

export function DropZone({
  onFile,
  disabled,
}: {
  onFile: (f: File) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [hot, setHot] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function accept(file: File | undefined | null) {
    if (!file) return;
    if (typeFromName(file.name).kind === "unknown") {
      setProblem(
        "Accepted formats are PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), HTML and images (PNG, JPEG, BMP, TIFF, HEIF).",
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setProblem(`That file is ${(file.size / 1048576).toFixed(1)} MB: the limit is 4.5 MB.`);
      return;
    }
    setProblem(null);
    onFile(file);
  }

  return (
    <div>
      <motion.div
        onClick={() => !disabled && input.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setHot(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setHot(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setHot(false);
          if (!disabled) accept(e.dataTransfer.files?.[0]);
        }}
        whileHover={disabled ? undefined : { scale: 1.006 }}
        whileTap={disabled ? undefined : { scale: 0.992 }}
        className={clsx(
          "relative cursor-pointer overflow-hidden rounded-[18px] px-6 py-9 text-center transition-colors duration-200",
          disabled && "pointer-events-none opacity-50",
        )}
        style={{
          background: hot
            ? "color-mix(in oklab, var(--brand) 11%, transparent)"
            : "var(--surface)",
          border: `1.5px dashed ${hot ? "var(--brand)" : "var(--line-2)"}`,
          backdropFilter: "blur(16px)",
        }}
      >
        {/* sweeping light while dragging */}
        <AnimatePresence>
          {hot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0"
            >
              <div
                className="absolute inset-y-0 w-1/3 animate-shimmer"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, color-mix(in oklab, var(--brand) 28%, transparent), transparent)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={hot ? { y: -5, scale: 1.09 } : { y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl"
          style={{
            background: "color-mix(in oklab, var(--brand) 16%, transparent)",
            color: "var(--brand)",
          }}
        >
          <UploadCloud className="h-5 w-5" strokeWidth={2} />
        </motion.div>

        <p className="text-[14.5px] font-semibold tracking-[-0.01em]">
          {hot ? "Release to analyse" : "Drop a financial document"}
        </p>
        <p className="mt-0.5 text-[12.5px] text-muted">
          PDF, Word, Excel, PowerPoint or an image · up to 4.5 MB
        </p>
        <p className="mt-0.5 text-[11.5px] text-faint">or click to browse</p>

        <input
          ref={input}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </motion.div>

      <AnimatePresence>
        {problem && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-2 text-[12.5px]"
            style={{ color: "var(--debt)" }}
          >
            {problem}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SampleRail({
  samples,
  active,
  onPick,
  disabled,
}: {
  samples: StatusResponse["samples"];
  active: string | null;
  onPick: (name: string) => void;
  disabled: boolean;
}) {
  if (!samples.length) {
    return (
      <p className="px-1 text-[12.5px] text-muted">
        No bundled fixtures were found in this deployment.
      </p>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-1">
      {samples.map((s, i) => {
        const isActive = active === s.name;
        return (
          <motion.button
            key={s.name}
            variants={riseIn}
            onClick={() => !disabled && onPick(s.name)}
            disabled={disabled}
            whileHover={disabled ? undefined : { x: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={clsx(
              "group relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
              disabled && "cursor-not-allowed opacity-45",
              !isActive && !disabled && "hover:bg-[color-mix(in_oklab,var(--brand)_8%,transparent)]",
            )}
            style={
              isActive
                ? {
                    background: "color-mix(in oklab, var(--brand) 14%, transparent)",
                    boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--brand) 28%, transparent)",
                  }
                : undefined
            }
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-semibold tnum transition-colors"
              style={{
                background: isActive
                  ? "var(--brand)"
                  : "color-mix(in oklab, var(--muted) 16%, transparent)",
                color: isActive ? "#fff" : "var(--muted)",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={clsx(
                  "block truncate text-[13px] font-medium leading-snug",
                  isActive ? "text-ink" : "text-ink-2",
                )}
              >
                {s.title}
              </span>
              {(s.category || s.blurb) && (
                <span className="block truncate text-[11.5px] leading-snug text-muted">
                  {s.category ?? s.blurb}
                </span>
              )}
            </span>
            <FileText
              className="h-3.5 w-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={2}
            />
          </motion.button>
        );
      })}
    </motion.div>
  );
}

export function IntakePanel({
  status,
  active,
  busy,
  onFile,
  onSample,
}: {
  status: StatusResponse | null;
  active: string | null;
  busy: boolean;
  onFile: (f: File) => void;
  onSample: (name: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--brand)" }} strokeWidth={2.4} />
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            Intake
          </h2>
        </div>
        <DropZone onFile={onFile} disabled={busy} />
      </Card>

      <Card className="p-4" spotlight={false}>
        <div className="mb-3 flex items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5" style={{ color: "var(--brand)" }} strokeWidth={2.4} />
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            Test fixtures
          </h2>
          <div className="flex-1" />
          {status && <Pill tone="neutral">{status.samples.length}</Pill>}
        </div>
        <SampleRail
          samples={status?.samples ?? []}
          active={active}
          onPick={onSample}
          disabled={busy}
        />
        <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-muted">
          Synthetic US financial documents covering deposits, investments, retirement
          plans, benefit income, property valuation, secured and unsecured debt,
          insurance and care costs. Each one is built around a specific extraction trap:
          subtotal double-counting, negative cash sweeps, prose-only amounts, cost-basis
          decoy columns, superseded figures.
        </p>
      </Card>
    </div>
  );
}
