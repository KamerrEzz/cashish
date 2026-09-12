import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { asistenteArticle } from "@/lib/docs/content/mas";

export const metadata: Metadata = {
  title: "Asistente",
  description: asistenteArticle.description,
};

export default function Page() {
  return <DocsArticleView article={asistenteArticle} />;
}
