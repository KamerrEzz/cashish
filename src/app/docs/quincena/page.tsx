import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { quincenaArticle } from "@/lib/docs/content/quincena";

export const metadata: Metadata = {
  title: "Quincena",
  description: quincenaArticle.description,
};

export default function Page() {
  return <DocsArticleView article={quincenaArticle} />;
}
