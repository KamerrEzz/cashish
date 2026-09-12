export type DocsSectionId = "product" | "agents";

export type DocsNavItem = {
  href: string;
  title: string;
  blurb: string;
  section: DocsSectionId;
};

export type DocsCalloutKind = "note" | "tip" | "warn";

export type DocsBlock =
  | { type: "paragraph"; text: string }
  | { type: "steps"; title?: string; items: string[] }
  | {
      type: "table";
      title?: string;
      headers: [string, string];
      rows: [string, string][];
    }
  | { type: "list"; title?: string; items: string[]; ordered?: boolean }
  | { type: "callout"; kind: DocsCalloutKind; title?: string; text: string }
  | { type: "term"; term: string; definition: string }
  | { type: "code"; title?: string; language?: string; code: string }
  | { type: "example"; title: string; text: string };

export type DocsArticle = {
  slug: string;
  title: string;
  description: string;
  lead: string;
  sections: {
    id: string;
    title: string;
    blocks: DocsBlock[];
  }[];
  next?: { href: string; label: string };
};
