"use client";

import { useState, useTransition } from "react";
import { createAccount } from "@/app/actions/accounts";
import { createPlannedInflow } from "@/app/actions/cashflow";
import { completeOnboarding } from "@/app/actions/onboarding";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, btnGhost, btnPrimary } from "@/components/ui";

type Step = 1 | 2 | 3;

export function OnboardingWizard({ today }: { today: string }) {
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function finish() {
    setError(null);
    startTransition(async () => {
      await completeOnboarding();
    });
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <ol className="flex gap-2 text-xs text-[var(--muted)]">
        {([1, 2, 3] as const).map((n) => (
          <li
            key={n}
            className={`flex-1 rounded-full px-2 py-1.5 text-center ${
              step === n
                ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-deep)]"
                : step > n
                  ? "bg-[var(--line)] text-[var(--ink)]"
                  : "bg-[var(--wash)]"
            }`}
          >
            {n === 1 ? "Liquidez" : n === 2 ? "Tarjeta" : "Ingreso"}
          </li>
        ))}
      </ol>

      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}

      {step === 1 ? (
        <form
          className="space-y-3"
          action={async (fd) => {
            setError(null);
            fd.set("type", "checking");
            const result = await createAccount(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setStep(2);
          }}
        >
          <p className="text-sm text-[var(--muted)]">
            Empieza con la cuenta donde llega tu quincena (débito o efectivo).
          </p>
          <Field label="Nombre">
            <input
              name="name"
              required
              className={inputClass}
              placeholder="BBVA débito"
              defaultValue="Cuenta principal"
            />
          </Field>
          <Field label="Saldo actual">
            <input
              name="openingBalance"
              className={inputClass}
              placeholder="5000.00"
              defaultValue="0"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <SubmitButton>Continuar</SubmitButton>
            <button
              type="button"
              className={btnGhost}
              onClick={() => setStep(2)}
            >
              Saltar
            </button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form
          className="space-y-3"
          action={async (fd) => {
            setError(null);
            fd.set("type", "credit_card");
            const result = await createAccount(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setStep(3);
          }}
        >
          <p className="text-sm text-[var(--muted)]">
            Agrega tu TDC con límite, día de corte y día de pago.
          </p>
          <Field label="Nombre">
            <input
              name="name"
              required
              className={inputClass}
              placeholder="Banorte Platinum"
            />
          </Field>
          <Field label="Límite de crédito">
            <input
              name="creditLimit"
              required
              className={inputClass}
              placeholder="50000.00"
            />
          </Field>
          <Field label="Deuda actual (opcional)">
            <input
              name="openingBalance"
              className={inputClass}
              placeholder="0.00"
              defaultValue="0"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Día de corte">
              <input
                name="statementCloseDay"
                type="number"
                min={1}
                max={28}
                required
                className={inputClass}
                defaultValue={15}
              />
            </Field>
            <Field label="Día de pago">
              <input
                name="paymentDueDay"
                type="number"
                min={1}
                max={28}
                required
                className={inputClass}
                defaultValue={3}
              />
            </Field>
          </div>
          <Field label="Pago mínimo (opcional)">
            <input
              name="minimumPayment"
              className={inputClass}
              placeholder="500.00"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <SubmitButton>Continuar</SubmitButton>
            <button
              type="button"
              className={btnGhost}
              onClick={() => setStep(3)}
            >
              Saltar
            </button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <form
          className="space-y-3"
          action={async (fd) => {
            setError(null);
            const result = await createPlannedInflow(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            finish();
          }}
        >
          <p className="text-sm text-[var(--muted)]">
            Registra tu nómina u otro ingreso planeado para el runway de
            quincena.
          </p>
          <Field label="Etiqueta">
            <input
              name="label"
              required
              className={inputClass}
              placeholder="Nómina"
              defaultValue="Nómina"
            />
          </Field>
          <Field label="Monto">
            <input
              name="amount"
              required
              className={inputClass}
              placeholder="25000.00"
            />
          </Field>
          <Field label="Próxima fecha">
            <input
              type="date"
              name="nextOn"
              required
              className={inputClass}
              defaultValue={today}
            />
          </Field>
          <Field label="Frecuencia">
            <select
              name="frequency"
              className={inputClass}
              defaultValue="monthly"
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </Field>
          <div className="flex flex-wrap gap-2">
            <SubmitButton disabled={pending}>
              {pending ? "Listo…" : "Ir a mi quincena"}
            </SubmitButton>
            <button
              type="button"
              className={btnPrimary}
              disabled={pending}
              onClick={() => finish()}
            >
              Omitir ingreso y terminar
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
