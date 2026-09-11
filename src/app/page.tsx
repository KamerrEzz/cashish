import Link from "next/link";
import { btnPrimary } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

function RunwayDecor() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="runway-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
          <stop offset="45%" stopColor="var(--accent)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--accent-deep)" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <path
        d="M0 520 C 180 480, 280 560, 420 500 S 640 380, 780 420 S 980 560, 1200 480"
        fill="none"
        stroke="url(#runway-stroke)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M0 560 C 200 540, 320 600, 460 540 S 700 430, 860 470 S 1040 580, 1200 520"
        fill="none"
        stroke="var(--accent)"
        strokeOpacity="0.18"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="780" cy="420" r="6" fill="var(--accent)" opacity="0.45" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <RunwayDecor />
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-6 sm:px-6">
        <span className="sr-only">Cashish</span>
        <ThemeToggle />
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="landing-brand font-[family-name:var(--font-display)] text-[clamp(3.5rem,12vw,6.5rem)] font-semibold leading-[0.95] tracking-tight text-[var(--accent-deep)]">
          Cashish
        </p>
        <h1 className="mt-6 max-w-2xl font-[family-name:var(--font-display)] text-[clamp(1.35rem,3.5vw,2rem)] font-medium leading-snug text-[var(--ink)]">
          Quincena y crédito de verdad — no saldos inventados.
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          Liquidez, cortes TDC y pagos en un ritual claro para saber si te
          alcanza.
        </p>
        <div className="mt-10">
          <Link href="/login" className={`${btnPrimary} text-base`}>
            Entrar
          </Link>
        </div>
      </main>
    </div>
  );
}
