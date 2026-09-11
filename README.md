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

## Preview desplegado

- App: https://cashish-beta.vercel.app
- Supabase project: `cashish` (`qlvjfbpnmpzkxmopcqte`)
- GitHub: https://github.com/KamerrEzz/cashish

### Auth (obligatorio para login)

En [Auth URL Configuration](https://supabase.com/dashboard/project/qlvjfbpnmpzkxmopcqte/auth/url-configuration):

1. **Site URL** = `https://cashish-beta.vercel.app`
2. **Redirect URLs** agrega `https://cashish-beta.vercel.app/auth/callback`

Opcional pero recomendado para preview: en Authentication → Providers → Email, desactiva **Confirm email** para poder entrar ya con email+contraseña.

### Cron / emails (opcional)

En Vercel → Project → Settings → Environment Variables, agrega `SUPABASE_SERVICE_ROLE_KEY` (API → service_role en Supabase). Sin esa key el app funciona; solo falla el job `/api/cron/reminders`.

`CRON_SECRET` ya está en Vercel.

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
