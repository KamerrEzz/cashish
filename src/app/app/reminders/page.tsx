import { requireUser } from "@/lib/auth";
import { dismissReminder } from "@/app/actions/subscriptions";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader, Panel, btnGhost } from "@/components/ui";
import { EmptyState } from "@/components/empty-state";
import { daysBetween, formatWeekdayDate, relativeDayLabel } from "@/lib/dates";
import { todayMexico } from "@/lib/credit-cycle";

const eventLabel: Record<string, string> = {
  statement_close: "Corte",
  payment_due: "Pago",
  subscription_charge: "Suscripción",
  cashflow_shortfall: "Flujo",
};

export default async function RemindersPage() {
  const { supabase } = await requireUser();
  const today = todayMexico();
  const { data: reminders } = await supabase
    .from("reminders")
    .select("*")
    .order("due_on", { ascending: true })
    .limit(50);

  const pending = (reminders ?? []).filter((r) => r.status === "pending");
  const done = (reminders ?? []).filter((r) => r.status !== "pending");

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title="Avisos"
        subtitle="Cortes, pagos, suscripciones y alertas de liquidez — sin ruido."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Pendientes</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {pending.length}
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Próximos 7 días</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {
              pending.filter((r) => {
                const d = daysBetween(today, r.due_on);
                return d >= 0 && d <= 7;
              }).length
            }
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Resueltos / enviados</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {done.length}
          </p>
        </Panel>
      </div>

      <Panel>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Cola
        </h2>
        {(reminders ?? []).length === 0 ? (
          <EmptyState
            title="Sin avisos todavía"
            body="El job diario genera recordatorios según tus ciclos de tarjeta y suscripciones."
            actionHref="/app/accounts"
            actionLabel="Revisar cuentas"
          />
        ) : (
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {(reminders ?? []).map((r) => {
              const days = daysBetween(today, r.due_on);
              const urgent = r.status === "pending" && days <= 3;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[var(--accent-soft)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--accent-deep)]">
                        {eventLabel[r.event_type] ?? r.event_type}
                      </span>
                      <span
                        className={`text-xs ${urgent ? "text-[var(--danger-ink)]" : "text-[var(--muted)]"}`}
                      >
                        {formatWeekdayDate(r.due_on)} · {relativeDayLabel(days)}
                      </span>
                    </div>
                    <p className="mt-1.5 font-medium text-[var(--ink)]">{r.title}</p>
                    <p className="mt-0.5 text-sm text-[var(--muted)]">{r.body}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {r.channel} · {r.status}
                    </p>
                  </div>
                  {r.status === "pending" && r.channel === "in_app" ? (
                    <form
                      action={async () => {
                        "use server";
                        await dismissReminder(r.id);
                      }}
                    >
                      <SubmitButton className={btnGhost}>Listo</SubmitButton>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
