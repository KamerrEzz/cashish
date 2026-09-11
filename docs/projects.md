# Proyectos

Cada **proyecto** es un ledger separado (cuentas, movimientos, TDC, suscripciones). No es una etiqueta: “Personal” y “Gatos” no se mezclan.

## Modelo

| Pieza | Detalle |
|-------|---------|
| `projects` | name, slug, created_by, `archived_at` (opcional) |
| `project_members` | roles `owner` \| `member` \| **`viewer`** |
| `project_invites` | email + token (7 días); rol `member` o `viewer` |
| Cookie | `cashish_project_id` — proyecto activo |
| Escritura | `requireProjectWriter()` / SQL `is_project_writer` — owner+member; viewer solo lee |
| MCP keys | Llevan `project_id` (scoped al crearlas) |
| BYOK | Sigue por usuario; el chat opera en el proyecto activo |

Signup crea automáticamente el proyecto **Personal** (no se archiva).

### Viewer

- Puede ver cuentas, movimientos, flujo, presupuestos del proyecto.
- No puede crear/editar/borrar ni aplicar imports/tickets.
- Mensaje de app: `Solo lectura en este proyecto.`

## Tickets

Bucket Storage `receipts`. Subes foto/PDF → parse BYOK → borrador → confirmar. Inbox en `/app/receipts`.

## Checklist

- [x] Migración proyectos + invites + receipts
- [x] Fix `create_project` RPC
- [x] Rol viewer + archive
- [ ] Switcher en header cambia el ledger
- [ ] Crear proyecto “Gatos”, cuenta y movimiento aislados de Personal
- [ ] Invitar viewer → `/invite/[token]` → membership read-only
- [ ] Subir ticket → borrador → aplicar
