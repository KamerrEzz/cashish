"use client";

import { useTransition } from "react";
import { switchProject } from "@/app/actions/projects";
import { inputClass } from "@/components/ui";

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
    <label className="flex min-w-0 items-center gap-2">
      <span className="sr-only">Proyecto activo</span>
      <select
        className={`${inputClass} !w-auto max-w-[10rem] truncate py-1.5 text-sm sm:max-w-[14rem]`}
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
