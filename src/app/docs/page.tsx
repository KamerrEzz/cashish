import Link from "next/link";
import { DOCS_NAV, DOCS_SECTIONS } from "@/lib/docs/nav";
import { btnGhost, btnPrimary } from "@/components/ui";

export const metadata = {
  title: "Documentación",
  description:
    "Cómo funciona cada sistema de Cashish: quincena, TDC, flujo, proyectos y agentes.",
};

export default function DocsIndexPage() {
  return (
    <div className="docs-index mx-auto max-w-3xl">
      <header className="docs-index-hero border-b border-[var(--line)] pb-10">
        <p className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,8vw,3.75rem)] font-semibold leading-[0.95] tracking-tight text-[var(--accent-deep)]">
          Documentación
        </p>
        <h1 className="mt-5 max-w-xl font-[family-name:var(--font-display)] text-[clamp(1.2rem,3vw,1.55rem)] font-medium leading-snug text-[var(--ink)]">
          Cómo funciona Cashish, sistema por sistema.
        </h1>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-[var(--muted)]">
          Guías para usar el ledger con crédito de verdad — y, si conectas
          agentes, la referencia MCP en la misma casa.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className={btnPrimary}>
            Crear cuenta
          </Link>
          <Link href="/docs/quincena" className={btnGhost}>
            Empezar por Quincena
          </Link>
        </div>
      </header>

      <div className="mt-12 space-y-14">
        {DOCS_SECTIONS.map((section) => {
          const items = DOCS_NAV.filter((i) => i.section === section.id);
          return (
            <section key={section.id} aria-labelledby={`sec-${section.id}`}>
              <h2
                id={`sec-${section.id}`}
                className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--ink)]"
              >
                {section.title}
              </h2>
              <p className="mt-1 max-w-lg text-sm text-[var(--muted)]">
                {section.description}
              </p>
              <ul className="mt-6 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex flex-col gap-0.5 py-4 transition-colors sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                    >
                      <span className="font-medium text-[var(--ink)] group-hover:text-[var(--accent-deep)]">
                        {item.title}
                      </span>
                      <span className="text-sm text-[var(--muted)] sm:max-w-md sm:text-right">
                        {item.blurb}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
