import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { presupuestosArticle } from "@/lib/docs/content/mas";

export const metadata: Metadata = {
  title: "Presupuestos",
  description: presupuestosArticle.description,
};

export default function Page() {
  return <DocsArticleView article={presupuestosArticle} />;
}
