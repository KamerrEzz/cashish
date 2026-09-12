import type { Metadata } from "next";
import { DocsShell } from "@/components/docs/docs-shell";

export const metadata: Metadata = {
  title: {
    template: "%s — Docs | Cashish",
    default: "Documentación — Cashish",
  },
  description:
    "Guías públicas de Cashish: quincena, crédito, flujo de caja, proyectos y agentes MCP.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocsShell>{children}</DocsShell>;
}
