import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { movimientosArticle } from "@/lib/docs/content/movimientos";

export const metadata: Metadata = {
  title: "Movimientos",
  description: movimientosArticle.description,
};

export default function Page() {
  return <DocsArticleView article={movimientosArticle} />;
}
