import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { transferenciasArticle } from "@/lib/docs/content/movimientos";

export const metadata: Metadata = {
  title: "Transferencias",
  description: transferenciasArticle.description,
};

export default function Page() {
  return <DocsArticleView article={transferenciasArticle} />;
}
