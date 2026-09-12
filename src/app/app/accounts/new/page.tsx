"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/app/actions/accounts";
import { SubmitButton } from "@/components/submit-button";
import { Field, PageHeader, Panel, inputClass } from "@/components/ui";

export default function NewAccountPage() {
  const router = useRouter();
  const [type, setType] = useState("checking");
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    setError(null);
    const result = await createAccount(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/app/accounts");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Nueva cuenta"
        subtitle="Elige moneda (MXN, COP, PEN o CLP). Para TDC captura límite, corte y pago."
      />
      <Panel className="max-w-xl">
        <form action={action} className="space-y-4">
          <Field label="Nombre">
            <input
              name="name"
              required
              className={inputClass}
              placeholder="BBVA Azul"
            />
          </Field>
          <Field label="Tipo">
            <select
              name="type"
              className={inputClass}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="cash">Efectivo</option>
              <option value="checking">Débito / cheques</option>
              <option value="savings">Ahorros</option>
              <option value="credit_card">Tarjeta de crédito</option>
            </select>
          </Field>
          <Field label="Moneda">
            <select name="currency" className={inputClass} defaultValue="MXN">
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="COP">COP — Peso colombiano</option>
              <option value="PEN">PEN — Sol peruano</option>
              <option value="CLP">CLP — Peso chileno</option>
            </select>
          </Field>
          <Field
            label={
              type === "credit_card"
                ? "Deuda actual (saldo que debes)"
                : "Saldo inicial"
            }
          >
            <input
              name="openingBalance"
              className={inputClass}
              placeholder="0.00"
              defaultValue="0"
            />
          </Field>
          {type === "credit_card" ? (
            <>
              <Field label="Límite de crédito">
                <input
                  name="creditLimit"
                  required
                  className={inputClass}
                  placeholder="50000.00"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Día de corte (1–28)">
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
                <Field label="Día de pago (1–28)">
                  <input
                    name="paymentDueDay"
                    type="number"
                    min={1}
                    max={28}
                    required
                    className={inputClass}
                    defaultValue={28}
                  />
                </Field>
              </div>
              <Field label="Pago mínimo (opcional)">
                <input
                  name="minimumPayment"
                  className={inputClass}
                  placeholder="0.00"
                />
              </Field>
            </>
          ) : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <SubmitButton>Crear cuenta</SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
