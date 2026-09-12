import Link from "next/link";
import type { DocsArticle, DocsBlock } from "@/lib/docs/types";
import { DocsCallout } from "@/components/docs/docs-callout";
import { DocsCode } from "@/components/docs/docs-code";
import { DocsSteps } from "@/components/docs/docs-steps";

function Block({ block }: { block: DocsBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="my-4 text-[15px] leading-relaxed text-[var(--muted)]">
          {block.text}
        </p>
      );
    case "steps":
      return <DocsSteps title={block.title} items={block.items} />;
    case "list":
      return (
        <div className="my-5">
          {block.title ? (
            <p className="mb-2 text-sm font-semibold text-[var(--ink)]">
              {block.title}
            </p>
          ) : null}
          {block.ordered ? (
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted)]">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          ) : (
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted)]">
              {block.items.map((item, i) => (
                <li key={i}>
                  {item.startsWith("cashish_") ? (
                    <code className="text-[var(--ink)]">{item}</code>
                  ) : (
                    item
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case "table":
      return (
        <div className="my-6 overflow-x-auto">
          {block.title ? (
            <p className="mb-2 text-sm font-semibold text-[var(--ink)]">
              {block.title}
            </p>
          ) : null}
          <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="py-2 pr-4 font-semibold text-[var(--ink)]">
                  {block.headers[0]}
                </th>
                <th className="py-2 font-semibold text-[var(--ink)]">
                  {block.headers[1]}
                </th>
              </tr>
            </thead>
            <tbody>
              {block.rows.map(([a, b], i) => (
                <tr key={i} className="border-b border-[var(--line)]/70">
                  <td className="py-2.5 pr-4 align-top font-medium text-[var(--ink)]">
                    {a}
                  </td>
                  <td className="py-2.5 align-top text-[var(--muted)]">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <DocsCallout kind={block.kind} title={block.title} text={block.text} />
      );
    case "term":
      return (
        <dl className="my-5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
          <dt className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--ink)]">
            {block.term}
          </dt>
          <dd className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            {block.definition}
          </dd>
        </dl>
      );
    case "code":
      return (
        <DocsCode title={block.title} language={block.language} code={block.code} />
      );
    case "example":
      return (
        <figure className="my-6 border-y border-[var(--line)] py-5">
          <figcaption className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--ink)]">
            {block.title}
          </figcaption>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            {block.text}
          </p>
        </figure>
      );
    default:
      return null;
  }
}

export function DocsArticleView({ article }: { article: DocsArticle }) {
  return (
    <article className="docs-article mx-auto max-w-[42rem]">
      <header className="mb-8 border-b border-[var(--line)] pb-8">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.85rem,4vw,2.35rem)] font-semibold tracking-tight text-[var(--ink)]">
          {article.title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          {article.lead}
        </p>
        {article.sections.length > 1 ? (
          <nav className="mt-6" aria-label="En esta página">
            <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {article.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-[var(--accent-deep)] underline-offset-2 hover:underline"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      {article.sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-24">
          <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--ink)] sm:text-[1.35rem]">
            {section.title}
          </h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}

      {article.next ? (
        <footer className="mt-12 border-t border-[var(--line)] pt-6">
          <p className="text-sm text-[var(--muted)]">Siguiente</p>
          <Link
            href={article.next.href}
            className="mt-1 inline-block font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--accent-deep)] underline-offset-2 hover:underline"
          >
            {article.next.label}
          </Link>
        </footer>
      ) : null}
    </article>
  );
}
