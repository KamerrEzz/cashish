import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { monedasArticle } from "@/lib/docs/content/mas";

export const metadata: Metadata = {
  title: "Monedas",
  description: monedasArticle.description,
};

export default function Page() {
  return <DocsArticleView article={monedasArticle} />;
}
