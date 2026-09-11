import Link from "next/link";
import { btnPrimary, btnGhost } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

function RunwayDecor() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-40"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="runway-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.1" />
          <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--accent-deep)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        d="M0 520 C 180 480, 280 560, 420 500 S 640 380, 780 420 S 980 560, 1200 480"
        fill="none"
        stroke="url(#runway-stroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M0 560 C 200 540, 320 600, 460 540 S 700 430, 860 470 S 1040 580, 1200 520"
        fill="none"
        stroke="var(--line)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="780" cy="420" r="5" fill="var(--accent)" opacity="0.5" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <RunwayDecor />
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-6 sm:px-6">
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--accent-deep)]">
          Cashish
        </span>
        <ThemeToggle />
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="landing-brand font-[family-name:var(--font-display)] text-[clamp(3.25rem,11vw,5.75rem)] font-semibold leading-[0.95] tracking-tight text-[var(--accent-deep)]">
          Cashish
        </p>
        <h1 className="mt-7 max-w-2xl font-[family-name:var(--font-display)] text-[clamp(1.25rem,3vw,1.85rem)] font-medium leading-snug text-[var(--ink)]">
          La quincena, con crédito de verdad.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          Liquidez, cortes y pagos en un ledger claro — para saber si te alcanza
          antes de que llegue el día.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/login" className={`${btnPrimary} text-base`}>
            Entrar
          </Link>
          <Link href="/docs/mcp" className={btnGhost}>
            Docs MCP
          </Link>
        </div>
      </main>
    </div>
  );
}
