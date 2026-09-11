import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";

export async function AppShell({ children }: { children: React.ReactNode }) {
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-full bg-[var(--wash)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md">
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/app"
            className="shrink-0 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--accent-deep)]"
          >
            Cashish
          </Link>
          <AppNav signOut={signOut} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        {children}
      </main>
    </div>
  );
}
