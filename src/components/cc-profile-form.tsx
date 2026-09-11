"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateCreditCardProfile } from "@/app/actions/accounts";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass } from "@/components/ui";

export function CcProfileForm({
  accountId,
  creditLimitCents,
  statementCloseDay,
  paymentDueDay,
  minimumPaymentCents,
}: {
  accountId: string;
  creditLimitCents: number;
  statementCloseDay: number;
  paymentDueDay: number;
  minimumPaymentCents: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSave(formData: FormData) {
    setError(null);
    formData.set("accountId", accountId);
    const result = await updateCreditCardProfile(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form action={onSave} className="space-y-3">
      <Field label="Límite de crédito">
        <input
          name="creditLimit"
          required
          className={inputClass}
          defaultValue={(creditLimitCents / 100).toFixed(2)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Día de corte">
          <input
            type="number"
            name="statementCloseDay"
            min={1}
            max={28}
            required
            className={inputClass}
            defaultValue={statementCloseDay}
          />
        </Field>
        <Field label="Día de pago">
          <input
            type="number"
            name="paymentDueDay"
            min={1}
            max={28}
            required
            className={inputClass}
            defaultValue={paymentDueDay}
          />
        </Field>
      </div>
      <Field label="Pago mínimo">
        <input
          name="minimumPayment"
          className={inputClass}
          defaultValue={(minimumPaymentCents / 100).toFixed(2)}
        />
      </Field>
      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      <SubmitButton>Guardar perfil</SubmitButton>
    </form>
  );
}
