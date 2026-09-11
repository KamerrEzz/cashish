import { requireUser } from "@/lib/auth";
import { dismissReminder } from "@/app/actions/subscriptions";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader, Panel, btnGhost } from "@/components/ui";

export default async function RemindersPage() {
  const { supabase } = await requireUser();
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .order("due_on", { ascending: true })
    .limit(50);

  return (
    <div>
      <PageHeader
        title="Recordatorios"
        subtitle="Cortes, fechas de pago y cobros de suscripciones (in-app y email)."
      />
      <Panel>
        <ul className="divide-y divide-[var(--line)]">
          {(reminders ?? []).length === 0 ? (
            <li className="py-2 text-sm text-[var(--muted)]">
              Aún no hay recordatorios. El job diario los genera según tus
              tarjetas y suscripciones.
            </li>
          ) : (
            (reminders ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-[var(--muted)]">{r.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {r.due_on} · {r.event_type} · {r.channel} · {r.status}
                  </p>
                </div>
                {r.status === "pending" && r.channel === "in_app" ? (
                  <form
                    action={async () => {
                      "use server";
                      await dismissReminder(r.id);
                    }}
                  >
                    <SubmitButton className={btnGhost}>Descartar</SubmitButton>
                  </form>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </Panel>
    </div>
  );
}
