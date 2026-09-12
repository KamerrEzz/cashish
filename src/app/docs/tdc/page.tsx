import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { tdcArticle } from "@/lib/docs/content/tdc";

export const metadata: Metadata = {
  title: "Tarjeta de crédito",
  description: tdcArticle.description,
};

export default function Page() {
  return <DocsArticleView article={tdcArticle} />;
}
