"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FileType2,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";

import { Card, Pill, SectionTitle } from "./ui";
import { typeFromName, type DocKind } from "@/lib/documents";

const ICONS: Record<DocKind, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  pdf: FileText,
  image: ImageIcon,
  word: FileType2,
  excel: FileSpreadsheet,
  powerpoint: FileType2,
  html: FileText,
  unknown: FileText,
};

/**
 * Shows the source document beside its extracted figures.
 *
 * PDFs and web-safe images render inline. Office files and TIFF/HEIF cannot be
 * displayed by a browser, so those offer a download instead of a broken frame.
 */
export default function RawDocument({
  src,
  filename,
  uploadedObjectUrl,
}: {
  src: string | null;
  filename: string;
  /** Set for an uploaded file, so the local copy can be shown without a round trip. */
  uploadedObjectUrl?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const type = typeFromName(filename);
  const Icon = ICONS[type.kind];
  const url = uploadedObjectUrl ?? src;

  // Escape closes the expanded overlay.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  if (!url) {
    return (
      <Card className="p-5">
        <SectionTitle icon={FileText}>Source document</SectionTitle>
        <p className="text-[13px] leading-relaxed text-muted">
          The original file is not retained after analysis, so there is nothing to show
          here. Uploads are read into memory, sent to Azure and discarded. Bundled
          fixtures can always be opened because they ship with the application.
        </p>
      </Card>
    );
  }

  const viewer = (
    <div
      className="w-full overflow-hidden rounded-xl border border-line"
      style={{ background: "color-mix(in oklab, var(--muted) 7%, transparent)" }}
    >
      {type.kind === "pdf" ? (
        <iframe
          src={`${url}#view=FitH`}
          title={`Source document: ${filename}`}
          className="w-full border-0"
          style={{ height: expanded ? "calc(100vh - 170px)" : 620 }}
        />
      ) : type.kind === "image" && type.previewable ? (
        <div className="grid place-items-center p-4">
          {/* A fixture or user file of unknown dimensions: next/image adds no value here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Source document: ${filename}`}
            className="max-h-[620px] w-auto max-w-full rounded-lg"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Icon className="h-7 w-7 text-faint" strokeWidth={1.6} />
          <p className="text-[13.5px] font-medium">{type.label}</p>
          <p className="max-w-sm text-[12.5px] leading-relaxed text-muted">
            A browser cannot display this format inline. Azure read it without any
            conversion; the extracted figures and the full layout evidence are in the
            other tabs.
          </p>
          <a
            href={url}
            download={filename}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2.2} />
            Download the original
          </a>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card className="p-5">
        <SectionTitle
          icon={Icon}
          right={
            <div className="flex items-center gap-1.5">
              <Pill tone="neutral">{type.label}</Pill>
              <button
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-muted transition-colors hover:border-line-2 hover:text-ink"
              >
                <Maximize2 className="h-3 w-3" strokeWidth={2.2} />
                Expand
              </button>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium text-muted transition-colors hover:border-line-2 hover:text-ink"
              >
                <ExternalLink className="h-3 w-3" strokeWidth={2.2} />
                New tab
              </a>
            </div>
          }
        >
          Source document
        </SectionTitle>

        <p className="mb-3 text-[12.5px] leading-snug text-muted">
          The file exactly as Azure received it. Read it beside the Position tab to check
          any figure against the page it was taken from.
        </p>

        {viewer}
      </Card>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[100] flex flex-col p-4 backdrop-blur-sm sm:p-6"
            style={{ background: "color-mix(in oklab, var(--canvas) 88%, transparent)" }}
          >
            <div className="mb-3 flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted" strokeWidth={2} />
              <span className="font-mono text-[13px] font-medium">{filename}</span>
              <Pill tone="neutral">{type.label}</Pill>
              <div className="flex-1" />
              <button
                onClick={() => setExpanded(false)}
                aria-label="Close"
                className="glass inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:text-ink"
              >
                <Minimize2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                Collapse
                <X className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>
            <motion.div
              initial={{ scale: 0.985, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="min-h-0 flex-1"
            >
              {viewer}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
