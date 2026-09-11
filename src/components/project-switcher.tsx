"use client";

import { useTransition } from "react";
import { switchProject } from "@/app/actions/projects";

type ProjectOption = {
  id: string;
  name: string;
  slug: string;
};

export function ProjectSwitcher({
  projects,
  activeId,
}: {
  projects: ProjectOption[];
  activeId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex min-w-0 items-center">
      <span className="sr-only">Proyecto activo</span>
      <select
        className="max-w-[9.5rem] truncate rounded-md border-0 bg-transparent py-1 pr-6 text-sm font-medium text-[var(--ink)] outline-none ring-0 hover:bg-[var(--wash)] focus:bg-[var(--wash)] sm:max-w-[13rem]"
        value={activeId}
        disabled={pending || projects.length === 0}
        aria-label="Cambiar proyecto"
        onChange={(e) => {
          const next = e.target.value;
          if (next === activeId) return;
          const fd = new FormData();
          fd.set("projectId", next);
          startTransition(() => {
            void switchProject(fd);
          });
        }}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
