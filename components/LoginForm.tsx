"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CircleAlert, Loader2, Lock, ScanLine } from "lucide-react";

import { Card } from "./ui";
import { PRODUCT } from "@/lib/brand";

export default function LoginForm({
  configured,
  next,
}: {
  configured: boolean;
  next: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !configured) return;

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Sign-in failed.");
        setBusy(false);
        return;
      }
      router.replace(next.startsWith("/") ? next : "/");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-line bg-[color-mix(in_oklab,var(--muted)_8%,transparent)] px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-[color-mix(in_oklab,var(--brand)_55%,transparent)]";

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.7, rotate: -14, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ delay: 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative mb-4 grid h-14 w-14 place-items-center rounded-2xl"
            style={{
              background: "linear-gradient(135deg, var(--brand), var(--brand-2))",
              boxShadow: "0 14px 40px -12px color-mix(in oklab, var(--brand) 85%, transparent)",
            }}
          >
            <ScanLine className="h-7 w-7 text-white" strokeWidth={2.2} />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-2xl"
              style={{ border: "1px solid rgb(255 255 255 / 0.32)" }}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <h1 className="text-[24px] font-semibold tracking-[-0.03em]">{PRODUCT.name}</h1>
          <p className="mt-1 text-[13px] text-muted">{PRODUCT.tagline}</p>
        </div>

        <Card className="p-6" spotlight={false}>
          {configured ? (
            <form onSubmit={submit} className="flex flex-col gap-3.5">
              <div>
                <label
                  htmlFor="username"
                  className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={field}
                  placeholder="Your username"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={field}
                  placeholder="Your password"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex gap-2.5 rounded-xl px-3 py-2.5"
                      style={{ background: "color-mix(in oklab, var(--debt) 11%, transparent)" }}
                    >
                      <CircleAlert
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        strokeWidth={2.3}
                        style={{ color: "var(--debt)" }}
                      />
                      <p className="text-[12.5px] leading-snug" style={{ color: "var(--debt)" }}>
                        {error}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={busy}
                whileHover={busy ? undefined : { scale: 1.015 }}
                whileTap={busy ? undefined : { scale: 0.985 }}
                className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, var(--brand), var(--brand-2))",
                  boxShadow: "0 10px 30px -10px color-mix(in oklab, var(--brand) 85%, transparent)",
                }}
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />
                    Signing in
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                  </>
                )}
              </motion.button>
            </form>
          ) : (
            <div className="flex flex-col gap-3 text-center">
              <Lock className="mx-auto h-5 w-5 text-muted" strokeWidth={1.8} />
              <p className="text-[14px] font-semibold">Sign-in is not configured</p>
              <p className="text-[13px] leading-relaxed text-muted">
                This deployment has no credentials set, so nobody can sign in. Set{" "}
                <code className="font-mono text-[12px] text-ink-2">APP_USERNAME</code> and{" "}
                <code className="font-mono text-[12px] text-ink-2">APP_PASSWORD</code> in the
                environment, then restart.
              </p>
            </div>
          )}
        </Card>

        <p className="mt-5 px-2 text-center text-[11.5px] leading-relaxed text-muted">
          A demo gate for a proof of concept. It is not an identity system and is not a
          safeguard for protected health information. Do not place real resident data
          behind it.
        </p>
      </motion.div>
    </main>
  );
}
