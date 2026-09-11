# Fase 3 — checklist smoke (E1–E4)

Smoke manual / doc checklist (e2e autenticado es frágil; Playwright público sigue en `e2e/smoke.spec.ts`).

## E1 — Import + tickets

- [ ] `/app/import` sube CSV/OFX → crea lote → `/app/import/[batchId]`
- [ ] Rechazar fila y aplicar lote a una cuenta (`apply_import_rows`)
- [ ] `/app/receipts` inbox: reintentar / descartar / aplicar (listo)
- [ ] Viewer no puede mutar (error “Solo lectura…”)

## E2 — Flujo + presupuestos

- [ ] `/app/cashflow` muestra proyección, faltante (si aplica), form de ingreso y MSI
- [ ] Dashboard card “Flujo de caja” enlaza a `/app/cashflow`
- [ ] `/app/budgets` crea/elimina sobre y muestra gasto del mes por categoría
- [ ] Cron: suscripciones past-due avanzan `next_billing_on`; shortfall inserta `cashflow_shortfall`

## E3 — TDC smart + suscripciones + proyectos

- [ ] Detalle de TDC: editar perfil + botones mínimo / sin intereses
- [ ] Suscripciones: editar + detectar sugerencias por `merchant_key`
- [ ] Proyecto: invitar `member|viewer`, quitar miembro, revocar invite, archivar (no Personal)

## E4 — Agentes / push / MCP

- [ ] Agentes: botón push (sin `NEXT_PUBLIC_VAPID_PUBLIC_KEY` muestra “configura VAPID”)
- [ ] Tools: `cashish_cashflow_forecast`, `cashish_suggest_subscriptions`, `cashish_list_receipts`, `cashish_list_installments`, `cashish_pay_to_avoid_interest` (confirm false = preview), `cashish_list_budgets`
- [ ] Analíticas: rollup dueño si hay >1 proyecto owned

## Automatizado

```bash
npx tsc --noEmit
npm test
```
