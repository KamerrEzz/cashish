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

Herramientas (27): panorama (`cashish_dashboard`, `cashish_upcoming_events`), cuentas CRUD + perfil TDC, movimientos/búsqueda, transferencias y pago TDC, cortes (abrir/cerrar/marcar pagado), suscripciones y recordatorios. Usa `cashish_list_tools_help` desde el agente.

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
| `CASHISH_APP_SECRET` | Wrap AES (≥32) para claves BYOK del asistente |
| `RESEND_API_KEY` | Emails de recordatorio (opcional) |

## Estructura

```
src/
  app/           # UI + API (ai, mcp, cron, auth)
  components/
  lib/
    money.ts     # aritmética segura en centavos
    ai/          # BYOK provider, chat loop, prompts
    finance-tools/ # registry compartido MCP + asistente
    mcp/         # auth de claves + wrapper MCP
    supabase/
docs/ai.md
supabase/migrations/
```

## Roadmap breve

1. ~~Proyectos (ledgers) + invitaciones + tickets MVP~~ (fase 2)  
2. Import CSV/OFX + sugerencias de suscripción  
3. Cashflow “¿alcanzo a cubrir los recurrentes?” + analíticas 2.5  
4. MSI · envelopes · push  

Ver también [`docs/ai.md`](docs/ai.md) y [`docs/projects.md`](docs/projects.md).  


## Licencia

Uso personal por ahora. El código vive en este repositorio.
