# Flujo de caja (cashflow)

Motor: `src/lib/cashflow/engine.ts` (`projectCashflow`).

## Entradas

- Liquidez inicial (suma de cuentas no-TDC)
- Ingresos planeados (`planned_inflows`)
- Suscripciones activas
- Obligaciones TDC (mínimo en fecha de pago)
- Planes MSI (`installment_plans`)

## Reglas

1. Horizonte en días desde `asOf` (timezone México en la app).
2. Recurrentes se expanden (weekly / monthly / yearly) dentro del horizonte.
3. Cada evento suma (ingreso) o resta (egreso) a la liquidez proyectada.
4. `status = shortfall` si el saldo proyectado cruza a negativo; `firstShortfallOn` + `shortfallCents` (peor hueco).

## Pagar para evitar intereses

`suggestPayToAvoidInterest`:

- `avoidInterestCents` = **closing_balance** del estado cerrado más reciente si existe y > 0; si no, **deuda actual** (`balance_cents` de la TDC).
- Nunca menor que el mínimo (`minimumCents`).
- UI/MCP: modos `minimum` | `avoid_interest` (y custom en la UI).

## MSI

`buildInstallmentSchedule(total, months 2–48, firstDueOn)` → cuota = `ceil(total/months)`.
Los planes activos entran al forecast como cargos mensuales hasta agotar `months_remaining`.
