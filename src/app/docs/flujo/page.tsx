import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { flujoArticle } from "@/lib/docs/content/flujo";

export const metadata: Metadata = {
  title: "Flujo de caja",
  description: flujoArticle.description,
};

export default function Page() {
  return <DocsArticleView article={flujoArticle} />;
}
