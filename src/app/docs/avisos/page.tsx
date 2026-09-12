import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { avisosArticle } from "@/lib/docs/content/movimientos";

export const metadata: Metadata = {
  title: "Avisos",
  description: avisosArticle.description,
};

export default function Page() {
  return <DocsArticleView article={avisosArticle} />;
}
