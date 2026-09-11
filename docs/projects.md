# Proyectos (fase 2)

Cada **proyecto** es un ledger separado (cuentas, movimientos, TDC, suscripciones). No es una etiqueta: “Personal” y “Gatos” no se mezclan.

## Modelo

| Pieza | Detalle |
|-------|---------|
| `projects` | name, slug, created_by |
| `project_members` | roles `owner` \| `member` |
| `project_invites` | email + token (7 días) |
| Cookie | `cashish_project_id` — proyecto activo |
| MCP keys | Llevan `project_id` (scoped al crearlas) |
| BYOK | Sigue por usuario; el chat opera en el proyecto activo |

Signup crea automáticamente el proyecto **Personal**.

## Tickets

Bucket Storage `receipts`. Subes foto/PDF en Movimientos → parse con BYOK (visión) → borrador → confirmar movimiento. No se inserta automático.

## Checklist

- [x] Migración `20260911080000_projects_invites_receipts.sql` aplicada
- [x] Fix `create_project` RPC (`20260911170000_create_project_rpc.sql`) — INSERT+RETURNING fallaba por RLS
- [ ] Switcher en header cambia el ledger
- [ ] Crear proyecto “Gatos”, cuenta y movimiento aislados de Personal
- [ ] Invitar por email → `/invite/[token]` → membership
- [ ] Subir ticket → borrador → aplicar
