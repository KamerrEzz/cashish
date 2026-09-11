import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { ProjectSwitcher } from "@/components/project-switcher";
import { maybeRedirectToOnboarding } from "@/lib/onboarding-gate";
import { requireProject } from "@/lib/projects";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { project, projects } = await requireProject();
  const pathname = (await headers()).get("x-pathname") ?? "";
  await maybeRedirectToOnboarding(pathname);

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--header)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/app"
              className="shrink-0 font-[family-name:var(--font-display)] text-[1.35rem] font-semibold tracking-tight text-[var(--accent-deep)]"
            >
              Cashish
            </Link>
            <span
              className="hidden h-4 w-px bg-[var(--line)] sm:block"
              aria-hidden
            />
            <ProjectSwitcher
              projects={projects.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
              }))}
              activeId={project.id}
            />
          </div>
          <AppNav signOut={signOut} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9 md:py-10">
        {children}
      </main>
    </div>
  );
}
