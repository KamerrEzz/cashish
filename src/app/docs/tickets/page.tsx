import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { ticketsArticle } from "@/lib/docs/content/mas";

export const metadata: Metadata = {
  title: "Tickets",
  description: ticketsArticle.description,
};

export default function Page() {
  return <DocsArticleView article={ticketsArticle} />;
}
