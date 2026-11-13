"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from "motion/react";
import clsx from "clsx";

/* ────────────────────────────────── Card ──────────────────────────────── */

export function Card({
  className,
  children,
  spotlight = true,
  ...rest
}: Omit<HTMLMotionProps<"div">, "children"> & {
  spotlight?: boolean;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-999);
  const my = useMotionValue(-999);

  // Hook must run unconditionally, so it is hoisted out of the JSX below.
  const glow = useTransform<number, string>(
    [mx, my],
    ([x, y]: number[]) =>
      `radial-gradient(420px circle at ${x}px ${y}px, color-mix(in oklab, var(--brand) 13%, transparent), transparent 72%)`,
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={(e) => {
        if (!spotlight || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set(e.clientX - r.left);
        my.set(e.clientY - r.top);
      }}
      onMouseLeave={() => {
        mx.set(-999);
        my.set(-999);
      }}
      className={clsx(
        "glass relative overflow-hidden rounded-[18px]",
        spotlight && "group",
        className,
      )}
      {...rest}
    >
      {spotlight && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glow }}
        />
      )}
      <div className="relative">{children}</div>
    </motion.div>
  );
}

/* ───────────────────────────────── CountUp ─────────────────────────────── */

export function CountUp({
  value,
  format,
  duration = 1.1,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={clsx("tnum", className)}>
      {format(inView ? shown : 0)}
    </span>
  );
}

/* ────────────────────────────────── Pill ───────────────────────────────── */

export function Pill({
  tone = "neutral",
  children,
  className,
  dot,
}: {
  tone?: "neutral" | "brand" | "asset" | "debt" | "warn";
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const colour = {
    neutral: "var(--muted)",
    brand: "var(--brand)",
    asset: "var(--asset)",
    debt: "var(--debt)",
    warn: "var(--warn)",
  }[tone];

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-medium",
        className,
      )}
      style={{
        color: tone === "neutral" ? "var(--ink-2)" : colour,
        background: `color-mix(in oklab, ${colour} 13%, transparent)`,
        border: `1px solid color-mix(in oklab, ${colour} 24%, transparent)`,
      }}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full animate-breathe"
          style={{ background: colour }}
        />
      )}
      {children}
    </span>
  );
}

/* ─────────────────────────────── SectionTitle ──────────────────────────── */

export function SectionTitle({
  children,
  right,
  icon: Icon,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="mb-3.5 flex items-center gap-3">
      {Icon && (
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
          style={{
            background: "color-mix(in oklab, var(--brand) 15%, transparent)",
            color: "var(--brand)",
          }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
        </span>
      )}
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        {children}
      </h3>
      <div className="hairline h-px flex-1" />
      {right}
    </div>
  );
}

/* ───────────────────────────────── MeterBar ────────────────────────────── */

export function MeterBar({
  value,
  max,
  colour,
  delay = 0,
  height = 8,
}: {
  value: number;
  max: number;
  colour: string;
  delay?: number;
  height?: number;
}) {
  const share = max > 0 ? Math.min(1, Math.abs(value) / max) : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ height, background: "color-mix(in oklab, var(--muted) 16%, transparent)" }}
    >
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        whileInView={{ width: `${share * 100}%` }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: `linear-gradient(90deg, color-mix(in oklab, ${colour} 55%, transparent), ${colour})`,
          boxShadow: `0 0 16px -2px color-mix(in oklab, ${colour} 60%, transparent)`,
        }}
      />
    </div>
  );
}

/* ──────────────────────────────── Ring gauge ───────────────────────────── */

export function Ring({
  value,
  size = 62,
  stroke = 5,
  colour = "var(--brand)",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  colour?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const spring = useSpring(0, { stiffness: 70, damping: 18 });
  const dash = useTransform(spring, (v) => `${v * circ} ${circ}`);

  useEffect(() => {
    spring.set(Math.max(0, Math.min(1, value)));
  }, [value, spring]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="color-mix(in oklab, var(--muted) 20%, transparent)"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={colour}
          strokeLinecap="round"
          style={{ strokeDasharray: dash, filter: `drop-shadow(0 0 6px ${colour})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* ───────────────────────────────── Empty ───────────────────────────────── */

export function Empty({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-line py-11 text-center">
      {Icon && <Icon className="h-5 w-5 text-faint" strokeWidth={1.6} />}
      <p className="max-w-sm text-[13.5px] text-muted">{children}</p>
    </div>
  );
}

/* ──────────────────────────────── Skeleton ─────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-lg",
        className ?? "h-4 w-full",
      )}
      style={{ background: "color-mix(in oklab, var(--muted) 14%, transparent)" }}
    >
      <div
        className="absolute inset-y-0 w-1/2 animate-shimmer"
        style={{
          background:
            "linear-gradient(90deg, transparent, color-mix(in oklab, var(--ink) 11%, transparent), transparent)",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────── Stagger list ──────────────────────────── */

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
};

export const riseIn = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const },
  },
};
