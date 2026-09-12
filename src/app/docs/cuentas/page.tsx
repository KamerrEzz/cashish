import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { cuentasArticle } from "@/lib/docs/content/cuentas";

export const metadata: Metadata = {
  title: "Cuentas",
  description: cuentasArticle.description,
};

export default function Page() {
  return <DocsArticleView article={cuentasArticle} />;
}
