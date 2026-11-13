"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { LogOut, ScanLine } from "lucide-react";

import { Pill } from "./ui";
import { PRODUCT } from "@/lib/brand";
import type { StatusResponse } from "@/lib/types";

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: -12 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative grid shrink-0 place-items-center rounded-xl"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, var(--brand), var(--brand-2))",
        boxShadow: "0 8px 24px -8px color-mix(in oklab, var(--brand) 70%, transparent)",
      }}
    >
      <ScanLine
        className="text-white"
        style={{ width: size * 0.5, height: size * 0.5 }}
        strokeWidth={2.4}
      />
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-xl"
        style={{ border: "1px solid rgb(255 255 255 / 0.34)" }}
        animate={{ opacity: [0.2, 0.75, 0.2] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      /* the cookie expires on its own either way */
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      aria-label="Sign out"
      className="glass inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-medium text-muted transition-all duration-200 hover:text-ink disabled:opacity-60"
    >
      <LogOut className="h-3.5 w-3.5" strokeWidth={2.2} />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}

export default function TopBar({ status }: { status: StatusResponse | null }) {
  return (
    <header
      className="sticky top-0 z-50 border-b border-line backdrop-blur-xl"
      style={{ background: "color-mix(in oklab, var(--canvas) 80%, transparent)" }}
    >
      <div className="mx-auto flex max-w-[1500px] items-center gap-3.5 px-5 py-3 sm:px-7">
        <Logo />
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-semibold leading-tight tracking-[-0.02em]">
            {PRODUCT.name}
          </h1>
          <p className="truncate text-[12px] leading-tight text-muted">{PRODUCT.tagline}</p>
        </div>

        <div className="flex-1" />

        <div className="hidden items-center gap-2 md:flex">
          {status ? (
            <>
              <Pill tone={status.azure.ready ? "asset" : "debt"} dot>
                {status.azure.ready ? "Azure Document Intelligence" : "Azure not configured"}
              </Pill>
              <Pill tone="brand" dot>
                Rules engine
              </Pill>
            </>
          ) : (
            <Pill tone="neutral">Connecting</Pill>
          )}
        </div>

        <SignOut />
      </div>
    </header>
  );
}
