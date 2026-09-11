# Cashish

<p align="center">
  <strong>Finanzas personales con crédito de verdad</strong><br/>
  México · MXN · cortes · pagos · suscripciones · MCP para agentes
</p>

<p align="center">
  <a href="https://cashish-beta.vercel.app">Live preview</a>
  ·
  <a href="https://cashish-beta.vercel.app/docs/mcp">MCP docs</a>
  ·
  <a href="#conectar-agentes-mcp">Conectar agentes</a>
</p>

---

## Por qué existe

La mayoría de apps tratan la tarjeta de crédito como “otra cuenta en negativo”.  
**Cashish modela el ciclo real:** límite, disponible, día de corte, fecha de pago, cargos del periodo y pagos vinculados desde tu débito.

Además recuerda **qué tarjeta cobra Netflix** y cuándo toca el siguiente cobro.

## Stack

| Capa | Tecnología |
| --- | --- |
| App | Next.js (App Router) |
| Datos | Supabase Postgres + Auth + RLS |
| Dinero | Centavos enteros (`Money`), nunca float |
| Agentes | MCP Streamable HTTP en `/api/mcp` |
| Deploy | Vercel |

## Funciones (Entrega 1)

- Cuentas: efectivo, débito, ahorros y **TDC**
- Perfil de tarjeta: límite, día de corte, día de pago
- Periodos de estado (abrir → cerrar snapshot → marcar pagado)
- Movimientos e ingresos
- Pago a tarjeta como **transferencia vinculada**
- Suscripciones ligadas a una tarjeta
- Recordatorios in-app (+ email cuando hay Resend)
- **MCP** para Cursor / Claude / otros agentes

## Conectar agentes (MCP)

1. Entra a la app → **Agentes** → crea una clave (`csh_…`).
2. Configura tu cliente:

```json
{
  "mcpServers": {
    "cashish": {
      "url": "https://cashish-beta.vercel.app/api/mcp",
      "headers": {
        "Authorization": "Bearer csh_TU_CLAVE"
      }
    }
  }
}
```

Herramientas: `cashish_dashboard`, `cashish_list_accounts`, `cashish_list_transactions`, `cashish_create_transaction`, `cashish_pay_credit_card`, `cashish_list_subscriptions`, `cashish_create_subscription`, `cashish_list_reminders`.

> El endpoint MCP requiere `SUPABASE_SERVICE_ROLE_KEY` en el entorno del servidor (nunca en el cliente).

## Desarrollo local

```bash
cp .env.example .env.local
# Rellena NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET

npm install
npm run dev
```

Migraciones: `supabase/migrations/`.

```bash
npm test
npm run build
```

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente / SSR |
| `SUPABASE_SERVICE_ROLE_KEY` | Cron + MCP (secreto) |
| `CRON_SECRET` | Auth del job `/api/cron/reminders` |
| `NEXT_PUBLIC_APP_URL` | URL pública (redirects / snippets MCP) |
| `RESEND_API_KEY` | Emails de recordatorio (opcional) |

## Estructura

```
src/
  app/           # UI + API (mcp, cron, auth)
  components/
  lib/
    money.ts     # aritmética segura en centavos
    mcp/         # auth de claves + tools MCP
    supabase/
supabase/migrations/
```

## Roadmap breve

1. Import CSV/OFX + sugerencias de suscripción  
2. Cashflow “¿alcanzo a cubrir los recurrentes?”  
3. MSI · envelopes · push · hogar compartido  

## Licencia

Uso personal por ahora. El código vive en este repositorio.
