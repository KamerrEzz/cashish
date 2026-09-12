import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { analiticasArticle } from "@/lib/docs/content/mas";

export const metadata: Metadata = {
  title: "Analíticas",
  description: analiticasArticle.description,
};

export default function Page() {
  return <DocsArticleView article={analiticasArticle} />;
}
