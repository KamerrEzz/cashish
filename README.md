# Cashish

Finanzas personales (México / MXN) con **tarjetas de crédito reales**: límite, disponible, corte, fecha de pago, pagos vinculados y suscripciones por tarjeta.

## Stack

- Next.js (App Router)
- Supabase (Auth magic link, Postgres, RLS)
- Montos en centavos enteros (`src/lib/money.ts`)
- Recordatorios in-app + email (cron diario + Resend opcional)

## Setup local

1. Copia env:

```bash
cp .env.example .env.local
```

2. Arranca Supabase local (Docker requerido):

```bash
npx supabase start
```

Copia `API URL`, `anon key` y `service_role key` a `.env.local`.

3. Aplica migraciones (si `start` no las aplicó):

```bash
npx supabase db reset
```

4. En el dashboard de Auth local, confirma que el magic link / Inbucket funciona (`supabase status` muestra el correo de prueba).

5. App:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — app
- `npm test` — tests de Money
- `npm run lint` — ESLint
- Cron manual: `GET /api/cron/reminders` con header `Authorization: Bearer $CRON_SECRET`

## Entrega 1 (implementada)

- Cuentas cash / débito / ahorros / TDC
- Perfil TDC (límite, día corte, día pago)
- Periodos de estado (abrir, cerrar snapshot, marcar pagado)
- Movimientos + pago TDC por transferencia vinculada
- Suscripciones ligadas a cuenta/tarjeta
- Dashboard + recordatorios in-app/email

## Fuera de alcance (siguiente)

CSV/OFX, cashflow “¿alcanzo?”, MSI, envelopes, push, multi-usuario, bank sync.
