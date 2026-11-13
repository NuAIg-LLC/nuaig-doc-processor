"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CircleAlert, ScanSearch, Sparkles } from "lucide-react";

import TopBar from "./TopBar";
import { IntakePanel } from "./Intake";
import Pipeline, { type StageKey } from "./Pipeline";
import Results from "./Results";
import { Card } from "./ui";
import { PRODUCT } from "@/lib/brand";
import type { AnalysisResponse, StatusResponse } from "@/lib/types";

/* ─────────────────────────────── idle hero ─────────────────────────────── */

const CAPABILITIES = [
  {
    title: "Assets and liabilities",
    body: "Accounts, holdings and real property on one side; mortgages, liens, card balances and medical debt on the other. Subtotal lines are detected and excluded so nothing is counted twice.",
  },
  {
    title: "Income and cashflow",
    body: "Benefit awards, pensions, annuities and systematic withdrawals: including amounts that only appear inside prose. Annual figures are converted and flagged as converted.",
  },
  {
    title: "Look-back exposure",
    body: "Gifts and third-party transfers are separated from movements between the resident's own accounts, which are never income and never gifts.",
  },
  {
    title: "Conflicts, not guesses",
    body: "A figure that is not stated stays null: never zero. Superseded amounts, negative cash sweeps and internal contradictions are raised for a reviewer rather than quietly resolved.",
  },
];

function Hero({ ready }: { ready: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-5"
    >
      <Card className="overflow-hidden p-7 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium"
            style={{
              background: "color-mix(in oklab, var(--brand) 14%, transparent)",
              color: "var(--brand)",
              border: "1px solid color-mix(in oklab, var(--brand) 26%, transparent)",
            }}
          >
            <Sparkles className="h-3 w-3" strokeWidth={2.4} />
            Proof of concept
          </span>

          <h2 className="mt-4 max-w-3xl text-[30px] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-[42px]">
            <span className="text-gradient">Financial documents in.</span>
            <br />
            Verifiable assets and liabilities out.
          </h2>

          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
            Senior-living admissions run on a stack of bank statements, brokerage
            summaries, award letters and family-prepared worksheets. LedgerLens reads
            them with Azure Document Intelligence, proposes structured candidate
            fields, and shows a reviewer exactly where every figure came from.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" style={{ color: "var(--brand)" }} strokeWidth={2.4} />
              {ready
                ? "Pick a fixture on the left, or drop your own PDF"
                : "Configure AZURE_DI_ENDPOINT and AZURE_DI_KEY to begin"}
            </span>
          </div>
        </motion.div>
      </Card>

      <div className="grid gap-3.5 sm:grid-cols-2">
        {CAPABILITIES.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 + i * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="h-full p-5">
              <div className="mb-2 flex items-center gap-2.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--brand)" }}
                />
                <h3 className="text-[14px] font-semibold tracking-[-0.015em]">{c.title}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-muted">{c.body}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      <p className="px-1 text-[12px] leading-relaxed text-muted">
        Every extracted figure is a candidate for human verification. This system
        proposes fields; it does not assign a risk tier, compute a funding gap, or
        recommend an admissions outcome. Identity data is reported as types only and
        is never copied into a financial field.
      </p>
    </motion.div>
  );
}

/* ─────────────────────────────── workspace ─────────────────────────────── */

export default function Workspace() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<StageKey | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  /**
   * The request is a single round trip, so the stage indicator is paced on a
   * timer that reflects how long each stage actually takes. It never claims a
   * stage finished: the final stage holds until the response lands.
   */
  const run = useCallback(async (url: string, body: BodyInit | null, label: string) => {
    clearTimers();
    setError(null);
    setResult(null);
    setStage("read");
    window.scrollTo({ top: 0, behavior: "smooth" });

    timers.current.push(setTimeout(() => setStage("layout"), 700));
    timers.current.push(setTimeout(() => setStage("extract"), 6500));
    timers.current.push(setTimeout(() => setStage("reconcile"), 22000));

    try {
      const response = await fetch(url, { method: "POST", body });
      const payload = await response.json();

      if (!response.ok || payload.error) {
        setError(payload.error ?? `Request failed (${response.status})`);
      } else {
        setResult(payload as AnalysisResponse);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message}: the document may be too large, or the request timed out.`
          : "The request failed.",
      );
    } finally {
      clearTimers();
      setStage(null);
      void label;
    }
  }, []);

  const onFile = useCallback(
    (f: File) => {
      setActive(null);
      setSourceUrl(null);
      // Show the user's own copy of the file; the server keeps nothing.
      setUploadedUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(f);
      });
      const fd = new FormData();
      fd.append("file", f);
      void run("/api/analyze", fd, f.name);
    },
    [run],
  );

  const onSample = useCallback(
    (name: string) => {
      setActive(name);
      setUploadedUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      setSourceUrl(`/api/sample-file/${encodeURIComponent(name)}`);
      void run(`/api/analyze-sample/${encodeURIComponent(name)}`, null, name);
    },
    [run],
  );

  const busy = stage !== null;

  return (
    <>
      <TopBar status={status} />

      <main className="mx-auto grid max-w-[1500px] gap-5 px-5 py-6 sm:px-7 lg:grid-cols-[308px_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-[77px]">
          <IntakePanel
            status={status}
            active={active}
            busy={busy}
            onFile={onFile}
            onSample={onSample}
          />
        </div>

        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {busy && <Pipeline key="pipeline" stage={stage} />}

            {!busy && error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
              >
                <Card className="p-6" spotlight={false}>
                  <div className="flex gap-3.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                      style={{
                        background: "color-mix(in oklab, var(--debt) 15%, transparent)",
                        color: "var(--debt)",
                      }}
                    >
                      <CircleAlert className="h-4.5 w-4.5" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold" style={{ color: "var(--debt)" }}>
                        Analysis failed
                      </p>
                      <p className="mt-1 break-words text-[13px] leading-relaxed text-ink-2">
                        {error}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {!busy && !error && result && (
              <Results
                key={result.filename}
                result={result}
                sourceUrl={sourceUrl}
                uploadedObjectUrl={uploadedUrl}
              />
            )}

            {!busy && !error && !result && (
              <Hero key="hero" ready={status?.azure.ready ?? false} />
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="mx-auto max-w-[1500px] px-5 pb-10 pt-4 sm:px-7">
        <div className="hairline mb-4 h-px" />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <ScanSearch className="h-3.5 w-3.5" strokeWidth={2} />
            Azure Document Intelligence · prebuilt-layout
          </span>
          {status?.engine.ready && <span>Extraction · {status.engine.engine}</span>}
          {status?.azure.endpointHost && (
            <span className="font-mono">{status.azure.endpointHost}</span>
          )}
          <div className="flex-1" />
          <span>All bundled fixtures are fictional.</span>
        </div>
      </footer>
    </>
  );
}
