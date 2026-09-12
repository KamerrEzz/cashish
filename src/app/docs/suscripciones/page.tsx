import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { suscripcionesArticle } from "@/lib/docs/content/movimientos";

export const metadata: Metadata = {
  title: "Suscripciones",
  description: suscripcionesArticle.description,
};

export default function Page() {
  return <DocsArticleView article={suscripcionesArticle} />;
}
