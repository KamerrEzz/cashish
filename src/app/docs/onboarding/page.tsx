import type { Metadata } from "next";
import { DocsArticleView } from "@/components/docs/docs-article";
import { onboardingArticle } from "@/lib/docs/content/onboarding";

export const metadata: Metadata = {
  title: "Onboarding",
  description: onboardingArticle.description,
};

export default function Page() {
  return <DocsArticleView article={onboardingArticle} />;
}
