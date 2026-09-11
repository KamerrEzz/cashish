# IA (BYOK + tools)

Asistente in-app estilo Synapse: el usuario trae su clave (BYOK), cifrada en el servidor. El modelo solo actúa sobre finanzas vía la misma capa de tools que MCP. **No hay RAG ni embeddings.**

## Quick path

1. Agentes → **Clave de modelo (BYOK)** → proveedor + key (`PUT /api/ai/key`).
2. Asistente → `/app/ai` → pregunta → `POST /api/ai/chat` (SSE + tool loop).
3. Agentes externos siguen en `/api/mcp` con claves `csh_…` (distintas del BYOK).

## Contrato

| Pieza | Decisión |
|-------|----------|
| SDK | `openai` con `baseURL` (`lib/ai/provider.ts`) |
| Proveedores | `openai` \| `nan` \| `compatible` (`lib/ai/catalog.ts`) |
| Clave | Por usuario, AES-256-GCM (`CASHISH_APP_SECRET`, salt `cashish-ai-key-v1`) |
| Tabla | `user_ai_credentials` — sin SELECT para `authenticated`; RPCs `save_own_ai_credential`, `own_ai_credential_*`, `delete_own_ai_credential` |
| Tools | `lib/finance-tools` — MCP y chat comparten `buildCashishTools` |
| LLM | System prompt en `lib/ai/prompts.ts`; temperatura 0.2 |
| Stream | SSE: `{ conversationId }`, `{ token }`, `{ tool }`, `{ done }`, `{ error }` |
| 409 | `missing_ai_key` si no hay credencial |

Next **no** usa `OPENAI_API_KEY` de producto.

Conversaciones y tools del asistente usan el **proyecto activo** (`cashish_project_id`). Las claves MCP también van atadas a un `project_id`. Ver [`projects.md`](./projects.md).

## Checklist

- [ ] `CASHISH_APP_SECRET` ≥32 en env (local + Vercel)
- [ ] Migración `20260911070000_ai_byok.sql` aplicada
- [ ] Guardar key en Agentes → last4 visible
- [ ] `/app/ai` sin key → gate a Agentes
- [ ] Con key: “¿cuánto debo en TDC?” dispara `cashish_dashboard`
- [ ] MCP sigue respondiendo con `csh_…`
