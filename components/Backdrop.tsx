"use client";

/**
 * The page canvas: three slowly drifting colour fields, a fine grid, a vignette
 * and a grain layer. Entirely decorative, fixed behind everything, no events.
 */
export default function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -top-[28vh] -left-[14vw] h-[78vh] w-[78vw] rounded-full blur-[120px] opacity-[0.20] animate-drift"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, color-mix(in oklab, var(--brand) 85%, transparent), transparent 66%)",
        }}
      />
      <div
        className="absolute -top-[14vh] right-[-18vw] h-[66vh] w-[66vw] rounded-full blur-[130px] opacity-[0.16] animate-drift-slow"
        style={{
          background:
            "radial-gradient(circle at 60% 40%, color-mix(in oklab, var(--brand-2) 80%, transparent), transparent 66%)",
        }}
      />
      <div
        className="absolute bottom-[-30vh] left-[22vw] h-[62vh] w-[62vw] rounded-full blur-[140px] opacity-[0.11] animate-drift"
        style={{
          animationDelay: "-14s",
          background:
            "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--asset) 65%, transparent), transparent 68%)",
        }}
      />

      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--line) 1px, transparent 1px), linear-gradient(to bottom, var(--line) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 100% 70% at 50% 0%, #000 20%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 100% 70% at 50% 0%, #000 20%, transparent 78%)",
        }}
      />

      {/* vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 0%, transparent 40%, color-mix(in oklab, var(--canvas) 92%, transparent) 100%)",
        }}
      />

      {/* grain */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.055] mix-blend-multiply">
        <filter id="ll-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ll-grain)" />
      </svg>
    </div>
  );
}
