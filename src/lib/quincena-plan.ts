import { asCurrency, formatMoney, money } from "@/lib/money";
import type { QuincenaSnapshot } from "@/lib/quincena";

export type QuincenaPayPreview = {
  accountId: string;
  accountName: string;
  mode: "avoid_interest" | "minimum";
  amountCents: number;
  dueOn: string;
  fromAccountId?: string | null;
};

export type QuincenaPlanAction = {
  type: "pay_card";
  accountId: string;
  accountName: string;
  mode: "avoid_interest" | "minimum";
  amountCents: number;
  dueOn: string;
  fromAccountId?: string | null;
  confirm: true;
  label: string;
};

export type QuincenaPlan = {
  summary: string;
  coverageOk: boolean;
  windowLabel: string;
  actions: QuincenaPlanAction[];
  notes: string[];
};

export function buildQuincenaPlanActions(
  snapshot: QuincenaSnapshot,
  payPreviews: QuincenaPayPreview[],
): QuincenaPlan {
  const coverageOk = snapshot.forecast.status === "coverage_ok";
  const notes: string[] = [];

  if (!coverageOk && snapshot.forecast.firstShortfallOn) {
    notes.push(
      `Faltante proyectado desde ${snapshot.forecast.firstShortfallOn} (~${formatMoney(money(snapshot.forecast.shortfallCents))}).`,
    );
  }

  for (const sub of snapshot.upcomingSubs) {
    notes.push(
      `Suscripción ${sub.name}: ${formatMoney(money(sub.amountCents))} el ${sub.nextBillingOn}.`,
    );
  }

  for (const close of snapshot.upcomingCloses) {
    notes.push(`Corte de ${close.accountName} el ${close.closesOn}.`);
  }

  const actions: QuincenaPlanAction[] = payPreviews
    .filter((p) => p.amountCents > 0)
    .map((p) => ({
      type: "pay_card" as const,
      accountId: p.accountId,
      accountName: p.accountName,
      mode: p.mode,
      amountCents: p.amountCents,
      dueOn: p.dueOn,
      fromAccountId: p.fromAccountId ?? null,
      confirm: true as const,
      label:
        p.mode === "avoid_interest"
          ? `Pagar ${p.accountName} sin intereses (${formatMoney(money(p.amountCents))})`
          : `Pagar mínimo de ${p.accountName} (${formatMoney(money(p.amountCents))})`,
    }));

  if (actions.length === 0) {
    notes.push("No hay pagos TDC sugeridos en esta ventana.");
  }

  const summary = coverageOk
    ? actions.length > 0
      ? `Te alcanza esta quincena. ${actions.length} pago${actions.length === 1 ? "" : "s"} TDC listo${actions.length === 1 ? "" : "s"} para confirmar.`
      : "Te alcanza esta quincena. Sin pagos TDC urgentes."
    : actions.length > 0
      ? `Hay presión de liquidez. Prioriza ${actions.length} pago${actions.length === 1 ? "" : "s"} TDC.`
      : "Hay presión de liquidez. Revisa ingresos y suscripciones.";

  return {
    summary,
    coverageOk,
    windowLabel: snapshot.window.label,
    actions,
    notes,
  };
}
