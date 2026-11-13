"use client";

import { AnimatePresence, motion } from "motion/react";
import { Brain, Check, FileSearch, ScanLine, ShieldCheck } from "lucide-react";
import clsx from "clsx";

const STAGES = [
  { key: "read", label: "Reading PDF", icon: FileSearch, note: "Validating and encoding" },
  { key: "layout", label: "Azure layout", icon: ScanLine, note: "OCR, tables, reading order" },
  { key: "extract", label: "Field extraction", icon: Brain, note: "Assets, liabilities, income" },
  { key: "reconcile", label: "Reconciling", icon: ShieldCheck, note: "Subtotals and conflicts" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export default function Pipeline({ stage }: { stage: StageKey }) {
  const index = STAGES.findIndex((s) => s.key === stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass rounded-[18px] p-6 sm:p-8"
    >
      <div className="mb-7 flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
            style={{ background: "var(--brand)" }}
          />
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: "var(--brand)" }}
          />
        </span>
        <p className="text-[13.5px] font-medium">
          Analysing document
          <span className="ml-2 text-muted">typically 8-25 seconds</span>
        </p>
      </div>

      <div className="relative grid gap-5 sm:grid-cols-4 sm:gap-3">
        {/* connector track */}
        <div
          aria-hidden
          className="absolute left-5 top-5 hidden h-px w-[calc(100%-2.5rem)] sm:block"
          style={{ background: "var(--line-2)" }}
        >
          <motion.div
            className="h-px"
            initial={{ width: "0%" }}
            animate={{ width: `${(index / (STAGES.length - 1)) * 100}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{
              background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
              boxShadow: "0 0 12px color-mix(in oklab, var(--brand) 80%, transparent)",
            }}
          />
        </div>

        {STAGES.map((s, i) => {
          const done = i < index;
          const live = i === index;
          const Icon = s.icon;

          return (
            <div key={s.key} className="relative z-10 flex items-start gap-3 sm:flex-col sm:gap-2.5">
              <motion.div
                animate={
                  live
                    ? { scale: [1, 1.08, 1] }
                    : { scale: 1 }
                }
                transition={live ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : {}}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors duration-300"
                style={{
                  background: done
                    ? "color-mix(in oklab, var(--asset) 18%, transparent)"
                    : live
                      ? "linear-gradient(135deg, var(--brand), var(--brand-2))"
                      : "color-mix(in oklab, var(--muted) 12%, transparent)",
                  color: done ? "var(--asset)" : live ? "#fff" : "var(--faint)",
                  boxShadow: live
                    ? "0 8px 26px -8px color-mix(in oklab, var(--brand) 85%, transparent)"
                    : "none",
                }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={done ? "done" : "icon"}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="grid place-items-center"
                  >
                    {done ? (
                      <Check className="h-4 w-4" strokeWidth={2.8} />
                    ) : (
                      <Icon className="h-4 w-4" strokeWidth={2.2} />
                    )}
                  </motion.span>
                </AnimatePresence>
              </motion.div>

              <div className="min-w-0 pt-0.5 sm:pt-0">
                <p
                  className={clsx(
                    "text-[13px] font-medium leading-tight transition-colors",
                    live ? "text-ink" : done ? "text-ink-2" : "text-faint",
                  )}
                >
                  {s.label}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-tight text-muted">{s.note}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* skeleton preview of the results that are coming */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-line p-4">
            <motion.div
              className="h-2.5 w-1/2 rounded-full"
              style={{ background: "color-mix(in oklab, var(--muted) 20%, transparent)" }}
              animate={{ opacity: [0.35, 0.85, 0.35] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.18 }}
            />
            <motion.div
              className="mt-3 h-6 w-3/4 rounded-lg"
              style={{ background: "color-mix(in oklab, var(--muted) 16%, transparent)" }}
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.18 + 0.1 }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
